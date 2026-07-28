/**
 * S2 Harness -- Configuration & Validation
 *
 * Loads and validates environment for Transcribe harness.
 * DISPOSABLE -- not production code.
 */

import type { HarnessConfig } from './types.js';

const ALLOWED_REGIONS = ['us-east-1', 'us-west-2', 'eu-west-1'] as const;

const VALID_LOCALE_PATTERN = /^[a-z]{2}-[A-Z]{2}$/;

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
  const timeoutMs = parseInt(process.env.TRANSCRIBE_TIMEOUT_MS || '30000', 10);
  const dryRunEnv = process.env.TRANSCRIBE_DRY_RUN ?? 'true';
  const dryRun = dryRunEnv !== 'false';

  // Validate region
  if (!ALLOWED_REGIONS.includes(region as (typeof ALLOWED_REGIONS)[number])) {
    errors.push(
      `Region "${region}" not authorized for this spike. Allowed: ${ALLOWED_REGIONS.join(', ')}`,
    );
  }

  // Validate locale candidates
  const localeRaw = process.env.TRANSCRIBE_LANGUAGE_CANDIDATES || 'es-US,es-ES,es-MX';
  const languageCandidates = localeRaw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  if (languageCandidates.length === 0) {
    errors.push('TRANSCRIBE_LANGUAGE_CANDIDATES must not be empty');
  }

  for (const locale of languageCandidates) {
    if (!VALID_LOCALE_PATTERN.test(locale)) {
      errors.push(`Invalid locale format: "${locale}" (expected xx-XX)`);
    }
  }

  // Validate timeout
  if (isNaN(timeoutMs) || timeoutMs < 1000 || timeoutMs > 120_000) {
    errors.push(
      `TRANSCRIBE_TIMEOUT_MS must be 1000-120000, got "${process.env.TRANSCRIBE_TIMEOUT_MS}"`,
    );
  }

  // Validate chunk duration
  const chunkDurationMs = parseInt(process.env.TRANSCRIBE_CHUNK_DURATION_MS || '100', 10);
  if (isNaN(chunkDurationMs) || chunkDurationMs < 50 || chunkDurationMs > 200) {
    errors.push(
      `TRANSCRIBE_CHUNK_DURATION_MS must be 50-200, got "${process.env.TRANSCRIBE_CHUNK_DURATION_MS}"`,
    );
  }

  // Warnings for live mode
  if (!dryRun) {
    const hasProfile = !!process.env.AWS_PROFILE;
    const hasKeys = !!process.env.AWS_ACCESS_KEY_ID && !!process.env.AWS_SECRET_ACCESS_KEY;
    if (!hasProfile && !hasKeys) {
      errors.push('AWS credentials required in live mode.');
    }
    warnings.push('Live mode enabled -- will attempt real AWS calls (T11 only).');
  }

  if (errors.length > 0) {
    return { valid: false, config: null, errors, warnings };
  }

  const fixtureDir =
    process.env.TRANSCRIBE_FIXTURE_DIR ||
    new URL('./fixtures', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1');

  return {
    valid: true,
    config: { region, profile, languageCandidates, timeoutMs, dryRun, fixtureDir, chunkDurationMs },
    errors: [],
    warnings,
  };
}
