/**
 * S3 Harness -- Event Pattern Builder
 *
 * Generates EventBridge rule event pattern.
 * DISPOSABLE -- not production code.
 */

export interface EventPattern {
  source: string[];
  'detail-type': string[];
}

export function buildEventPattern(): EventPattern {
  return {
    source: ['aws.ses'],
    'detail-type': ['Email Sent', 'Email Delivered'],
  };
}

export function validateEventPattern(pattern: EventPattern): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!pattern.source || !pattern.source.includes('aws.ses')) {
    errors.push('Pattern must include source "aws.ses"');
  }

  if (!pattern['detail-type'] || pattern['detail-type'].length === 0) {
    errors.push('Pattern must include at least one detail-type');
  }

  const required = ['Email Sent', 'Email Delivered'];
  for (const dt of required) {
    if (!pattern['detail-type']?.includes(dt)) {
      errors.push(`Pattern missing required detail-type: "${dt}"`);
    }
  }

  return { valid: errors.length === 0, errors };
}
