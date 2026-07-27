/**
 * S2 Harness -- WAV Parser & Validator
 *
 * Parses and validates WAV file headers for Transcribe compatibility.
 * Supports: PCM, mono, 16 kHz, 16-bit.
 *
 * DISPOSABLE -- not production code.
 */

import type { WavHeader, AudioValidationResult } from './types.js';

// WAV format constraints for Transcribe
const MIN_DURATION_MS = 500;
const MAX_DURATION_MS = 60_000; // 1 minute max for this spike
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const REQUIRED_SAMPLE_RATE = 16_000;
const REQUIRED_CHANNELS = 1;
const PCM_FORMAT_CODE = 1;
const SUPPORTED_BITS = [16] as const;

/**
 * Parses a WAV file buffer and extracts the header info.
 * Returns null if the buffer is not a valid WAV.
 */
export function parseWavHeader(buffer: Buffer): WavHeader | null {
  // Minimum WAV header: 44 bytes
  if (buffer.length < 44) {
    return null;
  }

  // Check RIFF magic
  const riff = buffer.toString('ascii', 0, 4);
  if (riff !== 'RIFF') {
    return null;
  }

  // Check WAVE format
  const wave = buffer.toString('ascii', 8, 12);
  if (wave !== 'WAVE') {
    return null;
  }

  // Check fmt chunk
  const fmt = buffer.toString('ascii', 12, 16);
  if (fmt !== 'fmt ') {
    return null;
  }

  // Read format fields
  const audioFormat = buffer.readUInt16LE(20);
  const channels = buffer.readUInt16LE(22);
  const sampleRate = buffer.readUInt32LE(24);
  const bitsPerSample = buffer.readUInt16LE(34);

  // Find data chunk
  let dataSize = 0;
  let offset = 36;
  while (offset < buffer.length - 8) {
    const chunkId = buffer.toString('ascii', offset, offset + 4);
    const chunkSize = buffer.readUInt32LE(offset + 4);
    if (chunkId === 'data') {
      dataSize = chunkSize;
      break;
    }
    offset += 8 + chunkSize;
  }

  const codec = audioFormat === PCM_FORMAT_CODE ? 'pcm' : 'unknown';
  const bytesPerSecond = sampleRate * channels * (bitsPerSample / 8);
  const durationMs = bytesPerSecond > 0 ? Math.round((dataSize / bytesPerSecond) * 1000) : 0;

  return { codec, channels, sampleRate, bitsPerSample, dataSize, durationMs };
}

/**
 * Validates a WAV buffer against Transcribe requirements.
 */
export function validateAudio(buffer: Buffer): AudioValidationResult {
  const errors: string[] = [];

  // Empty or too small
  if (buffer.length === 0) {
    return { valid: false, errors: ['File is empty (0 bytes)'] };
  }

  if (buffer.length > MAX_FILE_SIZE) {
    errors.push(`File too large: ${buffer.length} bytes (max ${MAX_FILE_SIZE})`);
  }

  // Parse header
  const header = parseWavHeader(buffer);
  if (!header) {
    return { valid: false, errors: ['Invalid WAV header or corrupted file'] };
  }

  // Codec
  if (header.codec !== 'pcm') {
    errors.push(`Unsupported codec: "${header.codec}" (only PCM supported)`);
  }

  // Channels
  if (header.channels !== REQUIRED_CHANNELS) {
    errors.push(`Stereo audio not supported: ${header.channels} channels (must be mono)`);
  }

  // Sample rate
  if (header.sampleRate !== REQUIRED_SAMPLE_RATE) {
    errors.push(
      `Invalid sample rate: ${header.sampleRate} Hz (must be ${REQUIRED_SAMPLE_RATE} Hz)`,
    );
  }

  // Bit depth
  if (!SUPPORTED_BITS.includes(header.bitsPerSample as (typeof SUPPORTED_BITS)[number])) {
    errors.push(`Unsupported bit depth: ${header.bitsPerSample} (must be 16-bit)`);
  }

  // Duration
  if (header.durationMs < MIN_DURATION_MS) {
    errors.push(`Audio too short: ${header.durationMs}ms (min ${MIN_DURATION_MS}ms)`);
  }

  if (header.durationMs > MAX_DURATION_MS) {
    errors.push(`Audio too long: ${header.durationMs}ms (max ${MAX_DURATION_MS}ms)`);
  }

  return { valid: errors.length === 0, errors, header };
}

/**
 * Generates a synthetic WAV buffer for testing.
 * Creates a valid PCM WAV with silence (zero samples).
 */
export function generateSyntheticWav(options: {
  sampleRate?: number;
  channels?: number;
  bitsPerSample?: number;
  durationMs?: number;
  codec?: number; // format code
}): Buffer {
  const sampleRate = options.sampleRate ?? 16_000;
  const channels = options.channels ?? 1;
  const bitsPerSample = options.bitsPerSample ?? 16;
  const durationMs = options.durationMs ?? 2000;
  const formatCode = options.codec ?? PCM_FORMAT_CODE;

  const numSamples = Math.floor((sampleRate * durationMs) / 1000);
  const bytesPerSample = bitsPerSample / 8;
  const dataSize = numSamples * channels * bytesPerSample;

  const headerSize = 44;
  const buffer = Buffer.alloc(headerSize + dataSize);

  // RIFF header
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);

  // fmt chunk
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); // chunk size
  buffer.writeUInt16LE(formatCode, 20);
  buffer.writeUInt16LE(channels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * channels * bytesPerSample, 28); // byte rate
  buffer.writeUInt16LE(channels * bytesPerSample, 32); // block align
  buffer.writeUInt16LE(bitsPerSample, 34);

  // data chunk
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  // Data is all zeros (silence)
  return buffer;
}
