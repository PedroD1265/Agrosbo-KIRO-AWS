/**
 * S1 Harness -- Configuration & Environment Validation
 *
 * Loads and validates environment variables for the Bedrock harness.
 * DISPOSABLE -- not production code.
 */

import type { HarnessConfig } from './types.js';

const REQUIRED_ENV = ['AWS_REGION', 'BEDROCK_MODEL_ID'] as const;

const DEFAULTS = {
  AWS_REGION: 'us-east-1',
  BEDROCK_MODEL_ID: 'amazon.nova-lite-v1:0',
  MAX_ITERATIONS: '10',
  TIMEOUT_MS: '30000',
} as const;

export interface ConfigValidation {
  valid: boolean;
  config: HarnessConfig | null;
  errors: string[];
  warnings: string[];
}

/**
 * Validates environment and builds config.
 * In dry-run mode, AWS credentials are not required.
 */
export function loadConfig(dryRun: boolean): ConfigValidation {
  const errors: string[] = [];
  const warnings: string[] = [];

  const region = process.env.AWS_REGION || DEFAULTS.AWS_REGION;
  const modelId = process.env.BEDROCK_MODEL_ID || DEFAULTS.BEDROCK_MODEL_ID;
  const maxIterations = parseInt(process.env.MAX_ITERATIONS || DEFAULTS.MAX_ITERATIONS, 10);
  const timeoutMs = parseInt(process.env.TIMEOUT_MS || DEFAULTS.TIMEOUT_MS, 10);

  // Validate region format
  if (!/^[a-z]{2}-[a-z]+-\d$/.test(region)) {
    errors.push(`Invalid AWS_REGION format: "${region}"`);
  }

  // Validate model ID format
  if (!modelId.includes('.') && !modelId.includes(':')) {
    warnings.push(`BEDROCK_MODEL_ID "${modelId}" may not be a valid model identifier`);
  }

  // Validate numeric configs
  if (isNaN(maxIterations) || maxIterations < 1 || maxIterations > 50) {
    errors.push(`MAX_ITERATIONS must be 1-50, got "${process.env.MAX_ITERATIONS}"`);
  }

  if (isNaN(timeoutMs) || timeoutMs < 1000 || timeoutMs > 120_000) {
    errors.push(`TIMEOUT_MS must be 1000-120000, got "${process.env.TIMEOUT_MS}"`);
  }

  // In live mode, check for AWS credentials
  if (!dryRun) {
    const hasProfile = !!process.env.AWS_PROFILE;
    const hasKeys = !!process.env.AWS_ACCESS_KEY_ID && !!process.env.AWS_SECRET_ACCESS_KEY;

    if (!hasProfile && !hasKeys) {
      errors.push(
        'AWS credentials required in live mode. Set AWS_PROFILE or AWS_ACCESS_KEY_ID + AWS_SECRET_ACCESS_KEY.',
      );
    }

    for (const key of REQUIRED_ENV) {
      if (!process.env[key]) {
        warnings.push(`${key} not set, using default: "${DEFAULTS[key]}"`);
      }
    }
  }

  if (errors.length > 0) {
    return { valid: false, config: null, errors, warnings };
  }

  return {
    valid: true,
    config: {
      region,
      modelId,
      maxIterations,
      timeoutMs,
      dryRun,
    },
    errors: [],
    warnings,
  };
}
