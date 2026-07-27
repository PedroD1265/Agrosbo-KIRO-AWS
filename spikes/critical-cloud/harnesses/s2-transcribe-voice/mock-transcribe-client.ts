/**
 * S2 Harness -- Mock Transcribe Client
 *
 * Simulates Amazon Transcribe responses for deterministic local testing.
 * Supports: exact result, error variants, timeout, empty response, locale selection.
 *
 * DISPOSABLE -- not production code.
 */

import type { TranscribeResponse, HarnessConfig } from './types.js';
import type { TranscribeClient } from './transcribe-client.js';

// ---------- Scenario types ----------

export type MockScenario =
  | { type: 'exact'; transcript: string }
  | { type: 'error_minor'; reference: string; modifications: Modification[] }
  | { type: 'timeout'; delayMs: number }
  | { type: 'service_error'; code: string; message: string }
  | { type: 'empty_response' }
  | { type: 'locale_selected'; transcript: string; locale: string };

export interface Modification {
  kind: 'substitute' | 'delete' | 'insert';
  position: number; // word index
  value?: string; // new value for substitute/insert
}

// ---------- Mock client ----------

export function createMockTranscribeClient(scenario: MockScenario): TranscribeClient {
  return {
    async transcribe(_audioBuffer: Buffer, config: HarnessConfig): Promise<TranscribeResponse> {
      switch (scenario.type) {
        case 'exact':
          return {
            success: true,
            result: {
              transcript: scenario.transcript,
              confidence: 0.98,
              languageCode: config.languageCandidates[0],
              durationMs: 2500,
            },
          };

        case 'error_minor':
          return {
            success: true,
            result: {
              transcript: applyModifications(scenario.reference, scenario.modifications),
              confidence: 0.85,
              languageCode: config.languageCandidates[0],
              durationMs: 3000,
            },
          };

        case 'timeout':
          await new Promise((resolve) => setTimeout(resolve, scenario.delayMs));
          throw new Error(`Transcribe timed out after ${scenario.delayMs}ms`);

        case 'service_error':
          return {
            success: false,
            error: { code: scenario.code, message: scenario.message },
          };

        case 'empty_response':
          return {
            success: true,
            result: {
              transcript: '',
              confidence: 0,
              languageCode: config.languageCandidates[0],
              durationMs: 1000,
            },
          };

        case 'locale_selected':
          return {
            success: true,
            result: {
              transcript: scenario.transcript,
              confidence: 0.92,
              languageCode: scenario.locale,
              durationMs: 2800,
            },
          };
      }
    },
  };
}

// ---------- Modification helpers ----------

function applyModifications(reference: string, modifications: Modification[]): string {
  const words = reference.split(' ');

  // Apply modifications in reverse order to keep indices stable
  const sorted = [...modifications].sort((a, b) => b.position - a.position);

  for (const mod of sorted) {
    switch (mod.kind) {
      case 'substitute':
        if (mod.position < words.length && mod.value) {
          words[mod.position] = mod.value;
        }
        break;
      case 'delete':
        if (mod.position < words.length) {
          words.splice(mod.position, 1);
        }
        break;
      case 'insert':
        if (mod.value) {
          words.splice(mod.position, 0, mod.value);
        }
        break;
    }
  }

  return words.join(' ');
}
