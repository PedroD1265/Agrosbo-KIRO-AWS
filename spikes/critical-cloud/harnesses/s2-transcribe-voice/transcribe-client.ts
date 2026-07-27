/**
 * S2 Harness -- Transcribe Client Interface
 *
 * Defines the abstraction for Amazon Transcribe interactions.
 * In T08, only the mock client is used.
 * Live client will be connected in T11.
 *
 * DISPOSABLE -- not production code.
 */

import type { TranscribeResponse, HarnessConfig } from './types.js';

// ---------- Client interface ----------

export interface TranscribeClient {
  transcribe(audioBuffer: Buffer, config: HarnessConfig): Promise<TranscribeResponse>;
}

// ---------- Live client placeholder ----------

/**
 * Creates a real Transcribe client (T11 only).
 * Not implemented in T08.
 */
export function createLiveClient(_config: HarnessConfig): TranscribeClient {
  throw new Error('Live Transcribe client not available in T08. Requires T11 authorization.');
}
