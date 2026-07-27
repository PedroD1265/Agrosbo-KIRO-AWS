/**
 * S3 Harness -- Queue Policy Builder & Validator
 *
 * Generates and validates the exact SQS policy for EventBridge -> SQS.
 * DISPOSABLE -- not production code.
 */

import type { QueuePolicy, QueuePolicyStatement, HarnessConfig } from './types.js';

/**
 * Builds the exact queue policy for the spike.
 */
export function buildQueuePolicy(config: HarnessConfig): QueuePolicy {
  const queueArn = `arn:aws:sqs:${config.region}:${config.accountId}:${config.sqsQueueName}`;
  const ruleArn = `arn:aws:events:${config.region}:${config.accountId}:rule/${config.eventBridgeRule}`;

  return {
    Version: '2012-10-17',
    Statement: [
      {
        Sid: 'AllowEventBridgeToSendMessage',
        Effect: 'Allow',
        Principal: { Service: 'events.amazonaws.com' },
        Action: 'sqs:SendMessage',
        Resource: queueArn,
        Condition: {
          ArnEquals: { 'aws:SourceArn': ruleArn },
          StringEquals: { 'aws:SourceAccount': config.accountId },
        },
      },
    ],
  };
}

export interface PolicyValidation {
  valid: boolean;
  errors: string[];
}

/**
 * Validates a queue policy against security requirements.
 */
export function validateQueuePolicy(policy: QueuePolicy, config: HarnessConfig): PolicyValidation {
  const errors: string[] = [];
  const expectedQueueArn = `arn:aws:sqs:${config.region}:${config.accountId}:${config.sqsQueueName}`;
  const expectedRuleArn = `arn:aws:events:${config.region}:${config.accountId}:rule/${config.eventBridgeRule}`;

  if (!policy.Statement || policy.Statement.length === 0) {
    errors.push('Policy has no statements');
    return { valid: false, errors };
  }

  const stmt = policy.Statement[0];

  // Principal must be events.amazonaws.com exactly
  if (typeof stmt.Principal === 'string') {
    if (stmt.Principal === '*') {
      errors.push('Wildcard Principal not allowed');
    } else {
      errors.push(
        `Principal must be {Service: "events.amazonaws.com"}, got string "${stmt.Principal}"`,
      );
    }
  } else if (stmt.Principal.Service !== 'events.amazonaws.com') {
    errors.push(`Invalid principal service: "${stmt.Principal.Service}"`);
  }

  // Action must be exactly sqs:SendMessage
  const action = Array.isArray(stmt.Action) ? stmt.Action[0] : stmt.Action;
  if (action !== 'sqs:SendMessage') {
    errors.push(`Action must be "sqs:SendMessage", got "${action}"`);
  }

  // Resource must be exact queue ARN
  if (stmt.Resource === '*') {
    errors.push('Wildcard Resource not allowed');
  } else if (stmt.Resource !== expectedQueueArn) {
    errors.push(`Resource must be exact queue ARN "${expectedQueueArn}", got "${stmt.Resource}"`);
  }

  // Condition: SourceArn
  if (!stmt.Condition?.ArnEquals?.['aws:SourceArn']) {
    errors.push('Missing Condition aws:SourceArn');
  } else if (stmt.Condition.ArnEquals['aws:SourceArn'] !== expectedRuleArn) {
    errors.push(
      `SourceArn must be "${expectedRuleArn}", got "${stmt.Condition.ArnEquals['aws:SourceArn']}"`,
    );
  }

  // Condition: SourceAccount
  if (!stmt.Condition?.StringEquals?.['aws:SourceAccount']) {
    errors.push('Missing Condition aws:SourceAccount');
  } else if (stmt.Condition.StringEquals['aws:SourceAccount'] !== config.accountId) {
    errors.push(
      `SourceAccount must be "${config.accountId}", got "${stmt.Condition.StringEquals['aws:SourceAccount']}"`,
    );
  }

  return { valid: errors.length === 0, errors };
}
