/**
 * S3 Harness -- Types
 *
 * Shared type definitions for SES -> EventBridge -> SQS spike.
 * DISPOSABLE -- not production code.
 */

// ---------- Configuration ----------

export interface HarnessConfig {
  region: string;
  profile: string;
  dryRun: boolean;
  timeoutMs: number;
  configurationSet: string;
  eventBridgeRule: string;
  sqsQueueName: string;
  senderEmail: string;
  recipientEmail: string;
  accountId: string;
}

// ---------- SES ----------

export interface SendEmailRequest {
  from: string;
  to: string;
  subject: string;
  body: string;
  configurationSet: string;
}

export interface SendEmailResult {
  messageId: string;
}

export type SesResponse =
  | { success: true; result: SendEmailResult }
  | { success: false; error: { code: string; message: string } };

// ---------- EventBridge events ----------

export type SesEventType = 'Email Sent' | 'Email Delivered';

export interface SesEventDetail {
  messageId: string;
  eventType: string;
  timestamp: string;
  recipient?: string;
}

export interface EventBridgeEvent {
  version: string;
  id: string;
  source: string;
  'detail-type': string;
  account: string;
  time: string;
  region: string;
  detail: SesEventDetail;
}

// ---------- SQS ----------

export interface SqsMessage {
  MessageId: string;
  ReceiptHandle: string;
  Body: string;
  Attributes?: Record<string, string>;
}

export type SqsReceiveResponse =
  | { success: true; messages: SqsMessage[] }
  | { success: false; error: { code: string; message: string } };

// ---------- Correlation ----------

export type DeliveryState = 'SENT' | 'DELIVERED';

export interface CorrelationRecord {
  messageId: string;
  state: DeliveryState;
  sentAt?: string;
  deliveredAt?: string;
  events: string[]; // event IDs processed
}

// ---------- Queue Policy ----------

export interface QueuePolicyStatement {
  Sid: string;
  Effect: 'Allow' | 'Deny';
  Principal: { Service: string } | string;
  Action: string | string[];
  Resource: string;
  Condition?: {
    ArnEquals?: { 'aws:SourceArn': string };
    StringEquals?: { 'aws:SourceAccount': string };
  };
}

export interface QueuePolicy {
  Version: string;
  Statement: QueuePolicyStatement[];
}

// ---------- Cleanup ----------

export interface CleanupStep {
  order: number;
  service: string;
  action: string;
  resource: string;
  reversible: boolean;
}

// ---------- Evidence ----------

export interface TestCaseResult {
  id: string;
  description: string;
  pass: boolean;
  detail: string;
}

export interface ExecutionEvidence {
  harnessVersion: string;
  timestamp: string;
  dryRun: boolean;
  region: string;
  configurationSet: string;
  rule: string;
  queue: string;
  casesExecuted: number;
  results: TestCaseResult[];
  correlations: number;
  duplicatesHandled: number;
  outOfOrderHandled: number;
  sanitizedErrors: string[];
  cleanupPlan: CleanupStep[];
  zeroAwsCalls: boolean;
  verdict: 'PASS' | 'PARTIAL' | 'FAIL';
}
