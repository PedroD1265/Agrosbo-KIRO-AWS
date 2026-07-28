/**
 * S3 Harness -- Event Parser
 *
 * Parses and validates SES events from EventBridge/SQS.
 * DISPOSABLE -- not production code.
 */

import type { EventBridgeEvent, SqsMessage } from './types.js';

const VALID_SOURCES = ['aws.ses'] as const;
const VALID_DETAIL_TYPES = ['Email Sent', 'Email Delivered'] as const;

export interface ParseResult {
  valid: boolean;
  event?: EventBridgeEvent;
  errors: string[];
}

/**
 * Parses an SQS message body as an EventBridge event.
 */
export function parseSqsBody(message: SqsMessage): ParseResult {
  const errors: string[] = [];

  if (!message.Body || message.Body.trim().length === 0) {
    return { valid: false, errors: ['Empty SQS message body'] };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(message.Body);
  } catch {
    return { valid: false, errors: ['Invalid JSON in SQS message body'] };
  }

  return validateEvent(parsed);
}

/**
 * Validates a parsed event against expected structure.
 */
export function validateEvent(raw: unknown): ParseResult {
  const errors: string[] = [];

  if (!raw || typeof raw !== 'object') {
    return { valid: false, errors: ['Event is not an object'] };
  }

  const event = raw as Record<string, unknown>;

  // Source
  const source = event['source'] as string | undefined;
  if (!source || !VALID_SOURCES.includes(source as (typeof VALID_SOURCES)[number])) {
    errors.push(`Invalid source: "${source}" (expected: ${VALID_SOURCES.join(', ')})`);
  }

  // Detail-type
  const detailType = event['detail-type'] as string | undefined;
  if (
    !detailType ||
    !VALID_DETAIL_TYPES.includes(detailType as (typeof VALID_DETAIL_TYPES)[number])
  ) {
    errors.push(
      `Invalid detail-type: "${detailType}" (expected: ${VALID_DETAIL_TYPES.join(', ')})`,
    );
  }

  // Detail with messageId (supports detail.messageId OR detail.mail.messageId)
  const detail = event['detail'] as Record<string, unknown> | undefined;
  if (!detail || typeof detail !== 'object') {
    errors.push('Missing or invalid detail object');
  } else {
    const directId = detail['messageId'] as string | undefined;
    const mailObj = detail['mail'] as Record<string, unknown> | undefined;
    const mailId = mailObj?.['messageId'] as string | undefined;
    if (!directId && !mailId) {
      errors.push(
        'Missing messageId in detail (checked detail.messageId and detail.mail.messageId)',
      );
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return { valid: true, event: raw as EventBridgeEvent, errors: [] };
}

/**
 * Extracts the SES messageId from an EventBridge event detail.
 * Supports both detail.messageId (mock/test) and detail.mail.messageId (real AWS).
 */
export function extractMessageId(detail: Record<string, unknown>): string | undefined {
  const direct = detail['messageId'] as string | undefined;
  if (direct) return direct.trim();
  const mail = detail['mail'] as Record<string, unknown> | undefined;
  const mailId = mail?.['messageId'] as string | undefined;
  return mailId?.trim();
}
