/**
 * S2 Harness -- Transcribe Client Interface + Live Streaming Implementation
 *
 * Live client uses @aws-sdk/client-transcribe-streaming.
 * Audio: PCM raw signed 16-bit LE, mono, 16000 Hz, no WAV header.
 * Chunks: configurable via chunkDurationMs (default 100ms = 3200 bytes).
 * Pacing: sleeps chunkDurationMs between chunks (injectable for tests).
 *
 * Multiple final results are concatenated in order (Transcribe may split a
 * long utterance into multiple non-partial results covering different segments).
 *
 * DISPOSABLE -- not production code.
 */

import {
  TranscribeStreamingClient,
  StartStreamTranscriptionCommand,
  type AudioEvent,
  type LanguageCode,
} from '@aws-sdk/client-transcribe-streaming';
import type { TranscribeResponse, HarnessConfig } from './types.js';

// ---------- Constants ----------

export const BYTES_PER_SECOND = 16000 * 2 * 1; // 16kHz * 16bit * mono = 32000 bytes/sec

/** Computes chunk size in bytes from duration in ms. Always even. */
export function chunkSizeForDuration(durationMs: number): number {
  const bytes = Math.floor((BYTES_PER_SECOND * durationMs) / 1000);
  return bytes % 2 === 0 ? bytes : bytes - 1; // ensure even for 16-bit samples
}

// Legacy export for tests that reference it
export const MAX_CHUNK_BYTES = BYTES_PER_SECOND; // kept for backward compat in tests

// ---------- Injectable sleep (for pacing) ----------

export type SleepFn = (ms: number) => Promise<void>;

const realSleep: SleepFn = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const VALID_LANGUAGE_CODES = new Set([
  'es-US',
  'es-ES',
  'en-US',
  'en-GB',
  'pt-BR',
  'fr-FR',
  'de-DE',
  'it-IT',
  'ja-JP',
  'ko-KR',
  'zh-CN',
]);

// ---------- Client interface ----------

export interface TranscribeClient {
  transcribe(audioBuffer: Buffer, config: HarnessConfig): Promise<TranscribeResponse>;
}

// ---------- Transcript event types (for mock injection) ----------

export interface MockTranscriptResult {
  IsPartial: boolean;
  Alternatives: Array<{
    Transcript: string;
    Items?: Array<{ Confidence?: number }>;
  }>;
}

export interface MockTranscriptEvent {
  TranscriptEvent: {
    Transcript: {
      Results: MockTranscriptResult[];
    };
  };
}

// ---------- Stream processor (testable) ----------

/**
 * Processes a TranscriptResultStream (or mock equivalent) and returns the
 * concatenated final transcript. Partial results are ignored.
 * Multiple final results are concatenated in order with a space separator.
 */
export async function processTranscriptStream(
  stream: AsyncIterable<MockTranscriptEvent | Record<string, unknown>>,
): Promise<{ transcript: string; confidence: number }> {
  const finalSegments: string[] = [];
  let totalConfidence = 0;
  let totalItems = 0;

  for await (const event of stream) {
    const te = (event as MockTranscriptEvent).TranscriptEvent;
    if (!te?.Transcript?.Results) continue;

    for (const result of te.Transcript.Results) {
      // Skip partial results
      if (result.IsPartial) continue;

      if (result.Alternatives && result.Alternatives.length > 0) {
        const alt = result.Alternatives[0];
        const text = alt.Transcript || '';
        if (text.length > 0) {
          finalSegments.push(text);
        }

        // Accumulate confidence from items
        if (alt.Items && alt.Items.length > 0) {
          for (const item of alt.Items) {
            totalConfidence += item.Confidence || 0;
            totalItems++;
          }
        }
      }
    }
  }

  const transcript = finalSegments.join(' ');
  const confidence = totalItems > 0 ? totalConfidence / totalItems : 0;

  return { transcript, confidence };
}

// ---------- Injectable SDK interface (for testing) ----------

export interface SdkSendable {
  send(
    command: unknown,
    options?: { abortSignal?: AbortSignal },
  ): Promise<{
    TranscriptResultStream?: AsyncIterable<MockTranscriptEvent | Record<string, unknown>>;
  }>;
}

// ---------- Live streaming client ----------

/**
 * Creates a real Transcribe streaming client.
 * Sends PCM audio (no WAV header) in chunks with pacing via StartStreamTranscription.
 *
 * Accepts optional overrides for testing:
 * - sdkClientOverride: fake SDK client
 * - sleepFnOverride: fake sleep for pacing (avoids real delays in tests)
 */
export function createLiveClient(
  config: HarnessConfig,
  sdkClientOverride?: SdkSendable,
  sleepFnOverride?: SleepFn,
): TranscribeClient {
  const sdkClient: SdkSendable =
    sdkClientOverride ?? new TranscribeStreamingClient({ region: config.region });
  const sleep = sleepFnOverride ?? realSleep;

  return {
    async transcribe(
      audioBuffer: Buffer,
      harnessConfig: HarnessConfig,
    ): Promise<TranscribeResponse> {
      const locale = harnessConfig.languageCandidates[0] || 'es-US';

      // Validate locale
      if (!VALID_LANGUAGE_CODES.has(locale)) {
        return {
          success: false,
          error: { code: 'InvalidLanguageCode', message: `Unsupported locale: "${locale}"` },
        };
      }

      const startTime = Date.now();
      const chunkBytes = chunkSizeForDuration(harnessConfig.chunkDurationMs);

      // Build chunked audio stream with pacing
      async function* audioStream(): AsyncGenerator<{ AudioEvent: AudioEvent }> {
        let offset = 0;
        while (offset < audioBuffer.length) {
          const end = Math.min(offset + chunkBytes, audioBuffer.length);
          // Ensure last chunk has even byte count
          const adjustedEnd = (end - offset) % 2 !== 0 ? end - 1 : end;
          const chunk = audioBuffer.subarray(offset, adjustedEnd > offset ? adjustedEnd : end);
          yield { AudioEvent: { AudioChunk: chunk } };
          offset = adjustedEnd > offset ? adjustedEnd : end;

          // Pace: sleep between chunks, but NOT after the last one
          if (offset < audioBuffer.length) {
            await sleep(harnessConfig.chunkDurationMs);
          }
        }
        // Generator exhaustion signals end of audio stream
      }

      const command = new StartStreamTranscriptionCommand({
        LanguageCode: locale as LanguageCode,
        MediaEncoding: 'pcm',
        MediaSampleRateHertz: 16000,
        AudioStream: audioStream(),
      });

      const abortController = new AbortController();
      const timeoutId = setTimeout(() => abortController.abort(), harnessConfig.timeoutMs);

      try {
        const response = await sdkClient.send(command, {
          abortSignal: abortController.signal,
        });

        clearTimeout(timeoutId);

        // Process stream -- concatenate final results
        const stream = response.TranscriptResultStream;
        if (!stream) {
          const durationMs = Date.now() - startTime;
          return {
            success: true,
            result: { transcript: '', confidence: 0, languageCode: locale, durationMs },
          };
        }

        const { transcript, confidence } = await processTranscriptStream(stream);

        const durationMs = Date.now() - startTime;

        return {
          success: true,
          result: { transcript, confidence, languageCode: locale, durationMs },
        };
      } catch (err) {
        clearTimeout(timeoutId);
        const message = err instanceof Error ? err.message : String(err);

        // Sanitize: no account IDs, no ARNs, no credentials in error
        const sanitized = message
          .replace(/\d{12}/g, '[ACCOUNT]')
          .replace(/arn:aws:[^\s]+/g, '[ARN]');

        if (
          message.includes('abort') ||
          message.includes('AbortError') ||
          message.includes('timed out')
        ) {
          return { success: false, error: { code: 'TimeoutError', message: sanitized } };
        }

        return { success: false, error: { code: 'TranscribeError', message: sanitized } };
      }
    },
  };
}
