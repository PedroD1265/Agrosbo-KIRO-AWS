import { describe, it, expect } from 'vitest';
import { isClientError } from '@/lib/sync/engine';

describe('Sync Engine Status Code & Retry-After Classification Tests', () => {
  it('IDEMPOTENCY_IN_PROGRESS + 409 → classified as retryable (isClientError = false)', () => {
    const err = {
      name: 'SyncEngineError',
      message: 'Solicitud duplicada en proceso',
      status: 409,
      code: 'IDEMPOTENCY_IN_PROGRESS',
      isIdempotencyInProgress: true,
    };

    expect(isClientError(409, err)).toBe(false);
  });

  it('Business 409 (domain duplicate) → classified as non-retryable failed (isClientError = true)', () => {
    const err = {
      name: 'SyncEngineError',
      message: 'Bloque ya existe',
      status: 409,
      isIdempotencyInProgress: false,
    };

    expect(isClientError(409, err)).toBe(true);
  });

  it('429 (Too Many Requests) → classified as retryable (isClientError = false)', () => {
    expect(isClientError(429)).toBe(false);
  });

  it('503 (Service Unavailable) → classified as retryable (isClientError = false)', () => {
    expect(isClientError(503)).toBe(false);
  });

  it('400 (Bad Request) → classified as non-retryable failed (isClientError = true)', () => {
    expect(isClientError(400)).toBe(true);
  });
});
