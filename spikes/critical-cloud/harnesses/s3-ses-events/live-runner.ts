/**
 * S3 Harness -- Live Runner
 *
 * Full SES -> EventBridge -> SQS flow against real AWS.
 * Features: residual detection, propagation verification, best-effort cleanup.
 * Activated only when SES_DRY_RUN=false.
 *
 * DISPOSABLE -- not production code.
 */

import {
  SESv2Client,
  SendEmailCommand,
  CreateConfigurationSetCommand,
  CreateConfigurationSetEventDestinationCommand,
  DeleteConfigurationSetEventDestinationCommand,
  DeleteConfigurationSetCommand,
  GetEmailIdentityCommand,
  GetConfigurationSetEventDestinationsCommand,
  ListConfigurationSetsCommand,
} from '@aws-sdk/client-sesv2';
import {
  EventBridgeClient,
  PutRuleCommand,
  PutTargetsCommand,
  RemoveTargetsCommand,
  DeleteRuleCommand,
  ListRulesCommand,
  ListTargetsByRuleCommand,
} from '@aws-sdk/client-eventbridge';
import {
  SQSClient,
  CreateQueueCommand,
  GetQueueUrlCommand,
  GetQueueAttributesCommand,
  SetQueueAttributesCommand,
  ReceiveMessageCommand,
  DeleteMessageCommand,
  DeleteQueueCommand,
} from '@aws-sdk/client-sqs';
import type { HarnessConfig, TestCaseResult } from './types.js';
import { CorrelationStore } from './correlation.js';
import { parseSqsBody, extractMessageId } from './event-parser.js';

// ---------- Exported state type (for testing) ----------

export interface LiveState {
  queueUrl?: string;
  queueArn?: string;
  ruleArn?: string;
  configSetCreated: boolean;
  eventDestCreated: boolean;
  ruleCreated: boolean;
  targetCreated: boolean;
  queueCreated: boolean;
}

// ---------- Injectable SDK interface ----------

export interface AwsClients {
  ses: {
    send(cmd: unknown): Promise<unknown>;
  };
  eb: {
    send(cmd: unknown): Promise<unknown>;
  };
  sqs: {
    send(cmd: unknown): Promise<unknown>;
  };
}

export type SleepFn = (ms: number) => Promise<void>;

// ---------- Sanitize ----------

export function sanitizeError(msg: string): string {
  return msg.replace(/\d{12}/g, '[ACCOUNT]').replace(/arn:aws:[^\s"]+/g, '[ARN]');
}

// ---------- Residual detection ----------

export async function checkResiduals(
  clients: AwsClients,
  config: HarnessConfig,
): Promise<{ found: boolean; details: string[] }> {
  const details: string[] = [];

  // Check SQS queue
  try {
    await clients.sqs.send(new GetQueueUrlCommand({ QueueName: config.sqsQueueName }));
    details.push(`SQS queue "${config.sqsQueueName}" already exists`);
  } catch {
    // NotFound is expected
  }

  // Check EventBridge rule
  try {
    const rulesResp = (await clients.eb.send(
      new ListRulesCommand({ NamePrefix: config.eventBridgeRule }),
    )) as { Rules?: Array<{ Name?: string }> };
    if (rulesResp.Rules?.some((r) => r.Name === config.eventBridgeRule)) {
      details.push(`EventBridge rule "${config.eventBridgeRule}" already exists`);
    }
  } catch {
    // Ignore
  }

  // Check SES configuration set
  try {
    const csResp = (await clients.ses.send(new ListConfigurationSetsCommand({}))) as {
      ConfigurationSets?: Array<{ Name?: string }>;
    };
    if (csResp.ConfigurationSets?.some((cs) => cs.Name === config.configurationSet)) {
      details.push(`SES configuration set "${config.configurationSet}" already exists`);
    }
  } catch {
    // Ignore
  }

  return { found: details.length > 0, details };
}

// ---------- Propagation verification ----------

export async function verifyPropagation(
  clients: AwsClients,
  config: HarnessConfig,
  state: LiveState,
): Promise<{ ok: boolean; errors: string[] }> {
  const errors: string[] = [];

  // Verify target on rule
  try {
    const targetsResp = (await clients.eb.send(
      new ListTargetsByRuleCommand({ Rule: config.eventBridgeRule }),
    )) as { Targets?: Array<{ Id?: string; Arn?: string }> };
    const target = targetsResp.Targets?.find((t) => t.Id === 'sqs-target');
    if (!target) {
      errors.push('Target sqs-target not found on rule');
    } else if (target.Arn !== state.queueArn) {
      errors.push('Target Arn does not match queue');
    }
  } catch (err) {
    errors.push(`ListTargetsByRule failed: ${sanitizeError((err as Error).message)}`);
  }

  // Verify event destination
  try {
    const destResp = (await clients.ses.send(
      new GetConfigurationSetEventDestinationsCommand({
        ConfigurationSetName: config.configurationSet,
      }),
    )) as {
      EventDestinations?: Array<{
        Name?: string;
        Enabled?: boolean;
        MatchingEventTypes?: string[];
        EventBridgeDestination?: { EventBusArn?: string };
      }>;
    };
    const dest = destResp.EventDestinations?.find((d) => d.Name === 'agrosbo-spike-eb-dest');
    if (!dest) {
      errors.push('Event destination agrosbo-spike-eb-dest not found');
    } else {
      if (!dest.Enabled) errors.push('Event destination not enabled');
      if (!dest.MatchingEventTypes?.includes('SEND'))
        errors.push('Missing SEND in MatchingEventTypes');
      if (!dest.MatchingEventTypes?.includes('DELIVERY'))
        errors.push('Missing DELIVERY in MatchingEventTypes');
      const expectedBus = `arn:aws:events:${config.region}:${config.accountId}:event-bus/default`;
      if (dest.EventBridgeDestination?.EventBusArn !== expectedBus)
        errors.push('EventBusArn does not match default bus');
    }
  } catch (err) {
    errors.push(`GetEventDestinations failed: ${sanitizeError((err as Error).message)}`);
  }

  return { ok: errors.length === 0, errors };
}

// ---------- Cleanup ----------

export async function cleanupResources(
  clients: AwsClients,
  config: HarnessConfig,
  state: LiveState,
): Promise<string[]> {
  const cleanupErrors: string[] = [];

  if (state.targetCreated) {
    try {
      await clients.eb.send(
        new RemoveTargetsCommand({ Rule: config.eventBridgeRule, Ids: ['sqs-target'] }),
      );
    } catch (err) {
      cleanupErrors.push(`RemoveTargets: ${sanitizeError((err as Error).message)}`);
    }
  }

  if (state.ruleCreated) {
    try {
      await clients.eb.send(new DeleteRuleCommand({ Name: config.eventBridgeRule }));
    } catch (err) {
      cleanupErrors.push(`DeleteRule: ${sanitizeError((err as Error).message)}`);
    }
  }

  if (state.eventDestCreated) {
    try {
      await clients.ses.send(
        new DeleteConfigurationSetEventDestinationCommand({
          ConfigurationSetName: config.configurationSet,
          EventDestinationName: 'agrosbo-spike-eb-dest',
        }),
      );
    } catch (err) {
      cleanupErrors.push(`DeleteEventDest: ${sanitizeError((err as Error).message)}`);
    }
  }

  if (state.configSetCreated) {
    try {
      await clients.ses.send(
        new DeleteConfigurationSetCommand({ ConfigurationSetName: config.configurationSet }),
      );
    } catch (err) {
      cleanupErrors.push(`DeleteConfigSet: ${sanitizeError((err as Error).message)}`);
    }
  }

  if (state.queueCreated && state.queueUrl) {
    try {
      await clients.sqs.send(new DeleteQueueCommand({ QueueUrl: state.queueUrl }));
    } catch (err) {
      cleanupErrors.push(`DeleteQueue: ${sanitizeError((err as Error).message)}`);
    }
  }

  // NOTE: DeleteEmailIdentity is NEVER called

  return cleanupErrors;
}

// ---------- Main Live Runner ----------

export async function runLiveS3(
  config: HarnessConfig,
  clientsOverride?: AwsClients,
  sleepOverride?: SleepFn,
): Promise<TestCaseResult[]> {
  const results: TestCaseResult[] = [];
  const region = config.region;
  const sleep = sleepOverride ?? ((ms: number) => new Promise((r) => setTimeout(r, ms)));

  const clients: AwsClients = clientsOverride ?? {
    ses: new SESv2Client({ region }),
    eb: new EventBridgeClient({ region }),
    sqs: new SQSClient({ region }),
  };

  const state: LiveState = {
    configSetCreated: false,
    eventDestCreated: false,
    ruleCreated: false,
    targetCreated: false,
    queueCreated: false,
  };

  try {
    // --- Preflight: verify sender identity ---
    console.log('  [preflight] Verifying sender identity...');
    try {
      const identityResp = (await clients.ses.send(
        new GetEmailIdentityCommand({ EmailIdentity: config.senderEmail }),
      )) as { VerifiedForSendingStatus?: boolean };
      if (!identityResp.VerifiedForSendingStatus) {
        results.push({
          id: 'LIVE-S3-PRE',
          description: 'Sender not verified -- HARD STOP',
          pass: false,
          detail: 'VerifiedForSendingStatus=false',
        });
        return results;
      }
    } catch (err) {
      const msg = sanitizeError((err as Error).message);
      results.push({
        id: 'LIVE-S3-PRE',
        description: msg.includes('AccessDenied') ? 'AccessDenied -- HARD STOP' : 'Preflight error',
        pass: false,
        detail: msg,
      });
      return results;
    }

    // --- Preflight: check residuals ---
    console.log('  [preflight] Checking for residual resources...');
    const residuals = await checkResiduals(clients, config);
    if (residuals.found) {
      results.push({
        id: 'LIVE-S3-PRE',
        description: 'RESIDUAL_RESOURCE_FOUND -- HARD STOP',
        pass: false,
        detail: residuals.details.join('; '),
      });
      return results;
    }

    results.push({
      id: 'LIVE-S3-PRE',
      description: 'Preflight passed',
      pass: true,
      detail: 'sender verified, no residuals',
    });
    console.log('  [ok] Preflight passed');

    // --- 1. Create SQS queue ---
    console.log('  [1] Creating SQS queue...');
    const createQueueResp = (await clients.sqs.send(
      new CreateQueueCommand({ QueueName: config.sqsQueueName }),
    )) as { QueueUrl?: string };
    state.queueUrl = createQueueResp.QueueUrl!;
    state.queueCreated = true;

    const attrResp = (await clients.sqs.send(
      new GetQueueAttributesCommand({ QueueUrl: state.queueUrl, AttributeNames: ['QueueArn'] }),
    )) as { Attributes?: Record<string, string> };
    state.queueArn = attrResp.Attributes!['QueueArn']!;

    // --- 2. Create EventBridge rule ---
    console.log('  [2] Creating EventBridge rule...');
    const ruleResp = (await clients.eb.send(
      new PutRuleCommand({
        Name: config.eventBridgeRule,
        EventPattern: JSON.stringify({
          source: ['aws.ses'],
          'detail-type': ['Email Sent', 'Email Delivered'],
        }),
        State: 'ENABLED',
      }),
    )) as { RuleArn?: string };
    state.ruleArn = ruleResp.RuleArn!;
    state.ruleCreated = true;

    // --- 3. Set queue policy ---
    console.log('  [3] Setting queue policy...');
    const policy = JSON.stringify({
      Version: '2012-10-17',
      Statement: [
        {
          Sid: 'AllowEventBridge',
          Effect: 'Allow',
          Principal: { Service: 'events.amazonaws.com' },
          Action: 'sqs:SendMessage',
          Resource: state.queueArn,
          Condition: { ArnEquals: { 'aws:SourceArn': state.ruleArn } },
        },
      ],
    });
    await clients.sqs.send(
      new SetQueueAttributesCommand({ QueueUrl: state.queueUrl, Attributes: { Policy: policy } }),
    );

    // --- 4. Add target ---
    console.log('  [4] Adding SQS target...');
    await clients.eb.send(
      new PutTargetsCommand({
        Rule: config.eventBridgeRule,
        Targets: [{ Id: 'sqs-target', Arn: state.queueArn }],
      }),
    );
    state.targetCreated = true;

    // --- 5. Create SES config set ---
    console.log('  [5] Creating SES configuration set...');
    await clients.ses.send(
      new CreateConfigurationSetCommand({ ConfigurationSetName: config.configurationSet }),
    );
    state.configSetCreated = true;

    // --- 6. Create event destination ---
    console.log('  [6] Creating event destination...');
    await clients.ses.send(
      new CreateConfigurationSetEventDestinationCommand({
        ConfigurationSetName: config.configurationSet,
        EventDestinationName: 'agrosbo-spike-eb-dest',
        EventDestination: {
          Enabled: true,
          MatchingEventTypes: ['SEND', 'DELIVERY'],
          EventBridgeDestination: {
            EventBusArn: `arn:aws:events:${region}:${config.accountId}:event-bus/default`,
          },
        },
      }),
    );
    state.eventDestCreated = true;

    // --- 7. Verify propagation ---
    console.log('  [7] Verifying propagation...');
    const propagation = await verifyPropagation(clients, config, state);
    if (!propagation.ok) {
      results.push({
        id: 'LIVE-S3-PROP',
        description: 'Propagation verification failed',
        pass: false,
        detail: propagation.errors.join('; '),
      });
      // Continue anyway with settle delay
    }

    // --- 8. Settle delay ---
    console.log(`  [8] Settling ${config.setupSettleMs}ms...`);
    await sleep(config.setupSettleMs);

    // --- 9. Send email ---
    console.log('  [9] Sending email...');
    const sendResp = (await clients.ses.send(
      new SendEmailCommand({
        FromEmailAddress: config.senderEmail,
        Destination: { ToAddresses: [config.recipientEmail] },
        Content: {
          Simple: {
            Subject: { Data: 'AGROSBO Spike S3 Test' },
            Body: { Text: { Data: 'SES->EventBridge->SQS validation.' } },
          },
        },
        ConfigurationSetName: config.configurationSet,
      }),
    )) as { MessageId?: string };
    const messageId = sendResp.MessageId!;
    results.push({
      id: 'LIVE-S3-SEND',
      description: 'SendEmail returns MessageId',
      pass: messageId.length > 0,
      detail: `msgId=${messageId.substring(0, 8)}...`,
    });

    // --- 10. Poll SQS ---
    console.log('  [10] Polling SQS...');
    const store = new CorrelationStore();
    let gotSent = false;
    let gotDelivered = false;
    const pollStart = Date.now();

    while (Date.now() - pollStart < config.timeoutMs && (!gotSent || !gotDelivered)) {
      const receiveResp = (await clients.sqs.send(
        new ReceiveMessageCommand({
          QueueUrl: state.queueUrl,
          MaxNumberOfMessages: 10,
          WaitTimeSeconds: 5,
        }),
      )) as { Messages?: Array<{ MessageId?: string; ReceiptHandle?: string; Body?: string }> };

      if (!receiveResp.Messages?.length) continue;

      for (const msg of receiveResp.Messages) {
        const parsed = parseSqsBody({
          MessageId: msg.MessageId || '',
          ReceiptHandle: msg.ReceiptHandle || '',
          Body: msg.Body || '',
        });

        if (!parsed.valid || !parsed.event) {
          console.log(`  [skip] Invalid event: ${parsed.errors[0] || 'unknown'}`);
          continue;
        }

        // Extract messageId from detail.mail.messageId or detail.messageId
        const evtDetail = parsed.event.detail;
        const eventMsgId = extractMessageId(evtDetail as unknown as Record<string, unknown>);
        const dt = parsed.event['detail-type'];

        // Diagnostic (sanitized)
        const hasMail = !!(evtDetail as unknown as Record<string, unknown>)['mail'];
        console.log(
          `  [diag] source=${parsed.event.source} type=${dt} hasMail=${hasMail} msgId=${eventMsgId ? eventMsgId.substring(0, 8) + '...' : 'NONE'} corr=${eventMsgId === messageId}`,
        );

        if (!eventMsgId || eventMsgId !== messageId) continue;

        if (dt === 'Email Sent') gotSent = true;
        if (dt === 'Email Delivered') gotDelivered = true;
        store.process(parsed.event);

        // Delete the message using the real ReceiptHandle
        if (msg.ReceiptHandle) {
          await clients.sqs.send(
            new DeleteMessageCommand({
              QueueUrl: state.queueUrl,
              ReceiptHandle: msg.ReceiptHandle,
            }),
          );
          console.log(`  [ok] Received + Deleted: ${dt}`);
        } else {
          console.log(`  [!] No ReceiptHandle, cannot delete: ${dt}`);
        }
      }
    }

    // --- 11. Evaluate ---
    results.push({
      id: 'LIVE-S3-SENT',
      description: 'Email Sent received',
      pass: gotSent,
      detail: gotSent ? 'correlated' : 'TIMEOUT',
    });
    results.push({
      id: 'LIVE-S3-DELIVERED',
      description: 'Email Delivered received',
      pass: gotDelivered,
      detail: gotDelivered ? 'correlated' : 'TIMEOUT',
    });
    const rec = store.getRecord(messageId);
    results.push({
      id: 'LIVE-S3-CORR',
      description: 'Correlation complete',
      pass: rec?.state === 'DELIVERED',
      detail: `state=${rec?.state ?? 'NONE'}`,
    });
  } catch (err) {
    const msg = sanitizeError((err as Error).message);
    results.push({
      id: 'LIVE-S3-ERR',
      description: 'Unexpected error',
      pass: false,
      detail: msg.substring(0, 150),
    });
  } finally {
    console.log('\n  [cleanup] Starting...');
    const cleanupErrors = await cleanupResources(clients, config, state);
    const cleanupOk = cleanupErrors.length === 0;
    results.push({
      id: 'LIVE-S3-CLEANUP',
      description: 'Cleanup (identity preserved)',
      pass: cleanupOk,
      detail: cleanupOk ? 'All removed' : cleanupErrors.join('; '),
    });
    console.log(`  ${cleanupOk ? '[ok]' : '[x]'} Cleanup ${cleanupOk ? 'complete' : 'PARTIAL'}`);
  }

  return results;
}
