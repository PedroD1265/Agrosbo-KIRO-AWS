/**
 * S3 Harness -- Configuration & Validation
 *
 * DISPOSABLE -- not production code.
 */

import type { HarnessConfig } from './types.js';

const ALLOWED_REGIONS = ['us-east-1'] as const;
const PLACEHOLDER_DOMAIN = 'example.invalid';

export interface ConfigValidation {
  valid: boolean;
  config: HarnessConfig | null;
  errors: string[];
  warnings: string[];
}

export function loadConfig(): ConfigValidation {
  const errors: string[] = [];
  const warnings: string[] = [];

  const region = process.env.AWS_REGION || 'us-east-1';
  const profile = process.env.AWS_PROFILE || 'agrosbo-role';
  const dryRunEnv = process.env.SES_DRY_RUN ?? 'true';
  const dryRun = dryRunEnv !== 'false';
  const timeoutMs = parseInt(process.env.SES_TIMEOUT_MS || '30000', 10);
  const configurationSet = process.env.SES_CONFIGURATION_SET || 'agrosbo-spike-ses-config-20260727';
  const eventBridgeRule = process.env.EVENTBRIDGE_RULE_NAME || 'agrosbo-spike-ses-rule-20260727';
  const sqsQueueName = process.env.SQS_QUEUE_NAME || 'agrosbo-spike-ses-events-20260727';
  const senderEmail = process.env.SES_TEST_SENDER_EMAIL || 'verified-sender@example.invalid';
  const recipientEmail = process.env.SES_TEST_RECIPIENT || 'success@simulator.amazonses.com';
  const accountId = '334856751415';

  // Validate region
  if (!ALLOWED_REGIONS.includes(region as (typeof ALLOWED_REGIONS)[number])) {
    errors.push(`Region "${region}" not authorized. Allowed: ${ALLOWED_REGIONS.join(', ')}`);
  }

  // Validate timeout
  if (isNaN(timeoutMs) || timeoutMs < 1000 || timeoutMs > 120_000) {
    errors.push(`SES_TIMEOUT_MS must be 1000-120000, got "${process.env.SES_TIMEOUT_MS}"`);
  }

  // Reject placeholder sender in non-mock mode
  if (!dryRun && senderEmail.endsWith(PLACEHOLDER_DOMAIN)) {
    errors.push(
      `Sender "${senderEmail}" uses placeholder domain "${PLACEHOLDER_DOMAIN}". ` +
        'A verified sender is required outside dry-run.',
    );
  }

  // Live mode warnings
  if (!dryRun) {
    const hasProfile = !!process.env.AWS_PROFILE;
    const hasKeys = !!process.env.AWS_ACCESS_KEY_ID && !!process.env.AWS_SECRET_ACCESS_KEY;
    if (!hasProfile && !hasKeys) {
      errors.push('AWS credentials required in live mode.');
    }
    warnings.push('Live mode -- will attempt real AWS calls (T12 only).');
  }

  if (errors.length > 0) {
    return { valid: false, config: null, errors, warnings };
  }

  return {
    valid: true,
    config: {
      region,
      profile,
      dryRun,
      timeoutMs,
      configurationSet,
      eventBridgeRule,
      sqsQueueName,
      senderEmail,
      recipientEmail,
      accountId,
    },
    errors: [],
    warnings,
  };
}
