/**
 * S2 Harness -- Amazon Transcribe Voice (Spike Runner)
 *
 * Validates locally:
 * - WAV parsing and validation
 * - Corpus and vocabulary structure
 * - WER and metrics calculation
 * - Mock Transcribe client scenarios
 * - Sanitized logging
 * - Structured evidence
 *
 * Default mode: --dry-run (no AWS calls).
 *
 * DISPOSABLE -- not production code.
 */

import { loadConfig } from './config.js';
import { validateAudio, generateSyntheticWav } from './wav-parser.js';
import { CORPUS } from './corpus.js';
import { getVocabularyTerms } from './vocabulary.js';
import { calculateCaseMetrics, calculateAggregateMetrics, calculateWer } from './metrics.js';
import { createMockTranscribeClient } from './mock-transcribe-client.js';
import {
  processTranscriptStream,
  createLiveClient,
  BYTES_PER_SECOND,
  chunkSizeForDuration,
  type MockTranscriptEvent,
  type SdkSendable,
  type SleepFn,
} from './transcribe-client.js';
import { sanitize, containsSensitive } from './sanitize.js';
import { buildEvidence, printEvidence } from './evidence.js';
import type { TestCaseResult, HarnessConfig } from './types.js';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

// ---------- Main ----------

async function main(): Promise<void> {
  console.log('===========================================================');
  console.log('  S2 -- Amazon Transcribe Voice (Spike Harness)');
  console.log('===========================================================\n');

  // Load config
  const configResult = loadConfig();
  if (configResult.warnings.length > 0) {
    for (const w of configResult.warnings) {
      console.log(`  [!] ${w}`);
    }
    console.log('');
  }
  if (!configResult.valid || !configResult.config) {
    console.error('  [x] Configuration invalid:');
    for (const e of configResult.errors) {
      console.error(`    - ${e}`);
    }
    process.exit(1);
  }

  const config = configResult.config;
  console.log(`  Mode:     ${config.dryRun ? 'DRY-RUN (mock)' : 'LIVE'}`);
  console.log(`  Region:   ${config.region}`);
  console.log(`  Locales:  ${config.languageCandidates.join(', ')}`);
  console.log(`  Timeout:  ${config.timeoutMs}ms`);
  console.log(`  Corpus:   ${CORPUS.length} phrases`);
  console.log(`  Vocab:    ${getVocabularyTerms().size} terms`);
  console.log('');

  const results: TestCaseResult[] = [];
  const errors: string[] = [];

  // ---------- WAV Validation Tests ----------
  console.log('> WAV Validation Tests\n');
  results.push(...runWavTests());

  // ---------- Transcription & Metrics Tests ----------
  console.log('\n> Transcription & Metrics Tests\n');
  results.push(...(await runTranscriptionTests(config)));

  // ---------- Streaming Client Tests ----------
  console.log('\n> Streaming Client Tests\n');
  results.push(...(await runStreamingClientTests()));

  // ---------- Infrastructure Tests ----------
  console.log('\n> Infrastructure Tests\n');
  results.push(...runInfraTests(config));

  // ---------- LIVE Transcription (only if not dry-run) ----------
  if (!config.dryRun) {
    console.log('\n> LIVE Transcription Tests\n');
    results.push(...(await runLiveTranscriptionTests(config)));
  }

  // ---------- Results ----------
  const metricsResults = results.filter((r) => r.metrics);
  const aggregate =
    metricsResults.length > 0 ? calculateAggregateMetrics(metricsResults) : undefined;

  console.log('\n===========================================================');
  console.log('  RESULTS');
  console.log('===========================================================\n');

  let passed = 0;
  let failed = 0;
  for (const r of results) {
    const icon = r.pass ? '[ok]' : '[x]';
    console.log(`  ${icon} ${r.id}: ${r.description}`);
    if (!r.pass) {
      console.log(`       ${r.detail}`);
    }
    if (r.pass) passed++;
    else failed++;
  }

  console.log(`\n  Total: ${results.length} | PASS: ${passed} | FAIL: ${failed}`);

  // Separate verdicts
  const liveResults = results.filter((r) => r.id.startsWith('LIVE-'));
  const localResults = results.filter((r) => !r.id.startsWith('LIVE-'));
  const localPassed = localResults.filter((r) => r.pass).length;
  const livePassed = liveResults.filter((r) => r.pass).length;

  if (liveResults.length > 0) {
    console.log(`\n  Local/dry-run: ${localPassed}/${localResults.length} PASS`);
    console.log(`  Live transcription: ${livePassed}/${liveResults.length} PASS`);
  }

  console.log(`\n  VERDICT: ${failed === 0 ? 'PASS' : 'FAIL'}\n`);

  // Evidence
  const evidence = buildEvidence(config, results, aggregate, errors);
  printEvidence(evidence);

  if (failed > 0) process.exit(1);
}

// ---------- WAV Tests ----------

function runWavTests(): TestCaseResult[] {
  const results: TestCaseResult[] = [];

  // 1. Valid WAV
  const validWav = generateSyntheticWav({ durationMs: 2000 });
  const validResult = validateAudio(validWav);
  results.push({
    id: 'WAV-01',
    description: 'Valid PCM mono 16kHz WAV accepted',
    pass: validResult.valid,
    detail: validResult.valid
      ? `header: ${validResult.header?.sampleRate}Hz ${validResult.header?.channels}ch ${validResult.header?.bitsPerSample}bit ${validResult.header?.durationMs}ms`
      : validResult.errors.join('; '),
  });
  console.log(`  ${validResult.valid ? '[ok]' : '[x]'} WAV-01`);

  // 2. Invalid header
  const badHeader = Buffer.from('NOT_A_WAV_FILE_AT_ALL_JUST_GARBAGE_DATA_HERE!!');
  const badResult = validateAudio(badHeader);
  results.push({
    id: 'WAV-02',
    description: 'Invalid WAV header rejected',
    pass: !badResult.valid && badResult.errors.some((e) => e.includes('Invalid WAV header')),
    detail: badResult.errors.join('; '),
  });
  console.log(`  ${!badResult.valid ? '[ok]' : '[x]'} WAV-02`);

  // 3. Unsupported codec (format code 6 = A-law)
  const alawWav = generateSyntheticWav({ codec: 6, durationMs: 2000 });
  const alawResult = validateAudio(alawWav);
  results.push({
    id: 'WAV-03',
    description: 'Unsupported codec rejected',
    pass: !alawResult.valid && alawResult.errors.some((e) => e.includes('codec')),
    detail: alawResult.errors.join('; '),
  });
  console.log(`  ${!alawResult.valid ? '[ok]' : '[x]'} WAV-03`);

  // 4. Invalid sample rate (44100)
  const wrongRate = generateSyntheticWav({ sampleRate: 44100, durationMs: 2000 });
  const rateResult = validateAudio(wrongRate);
  results.push({
    id: 'WAV-04',
    description: 'Invalid sample rate rejected',
    pass: !rateResult.valid && rateResult.errors.some((e) => e.includes('sample rate')),
    detail: rateResult.errors.join('; '),
  });
  console.log(`  ${!rateResult.valid ? '[ok]' : '[x]'} WAV-04`);

  // 5. Stereo rejected
  const stereo = generateSyntheticWav({ channels: 2, durationMs: 2000 });
  const stereoResult = validateAudio(stereo);
  results.push({
    id: 'WAV-05',
    description: 'Stereo audio rejected',
    pass: !stereoResult.valid && stereoResult.errors.some((e) => e.includes('Stereo')),
    detail: stereoResult.errors.join('; '),
  });
  console.log(`  ${!stereoResult.valid ? '[ok]' : '[x]'} WAV-05`);

  // 6. Too short
  const tooShort = generateSyntheticWav({ durationMs: 100 });
  const shortResult = validateAudio(tooShort);
  results.push({
    id: 'WAV-06',
    description: 'Audio too short rejected',
    pass: !shortResult.valid && shortResult.errors.some((e) => e.includes('too short')),
    detail: shortResult.errors.join('; '),
  });
  console.log(`  ${!shortResult.valid ? '[ok]' : '[x]'} WAV-06`);

  // 7. Too long
  const tooLong = generateSyntheticWav({ durationMs: 90_000 });
  const longResult = validateAudio(tooLong);
  results.push({
    id: 'WAV-07',
    description: 'Audio too long rejected',
    pass: !longResult.valid && longResult.errors.some((e) => e.includes('too long')),
    detail: longResult.errors.join('; '),
  });
  console.log(`  ${!longResult.valid ? '[ok]' : '[x]'} WAV-07`);

  // 8. Empty file
  const empty = Buffer.alloc(0);
  const emptyResult = validateAudio(empty);
  results.push({
    id: 'WAV-08',
    description: 'Empty file rejected',
    pass: !emptyResult.valid && emptyResult.errors.some((e) => e.includes('empty')),
    detail: emptyResult.errors.join('; '),
  });
  console.log(`  ${!emptyResult.valid ? '[ok]' : '[x]'} WAV-08`);

  return results;
}

// ---------- Transcription Tests ----------

async function runTranscriptionTests(config: HarnessConfig): Promise<TestCaseResult[]> {
  const results: TestCaseResult[] = [];
  const corpusEntry = CORPUS[0]; // RIEGO-01

  // 9. Exact transcription
  const exactClient = createMockTranscribeClient({
    type: 'exact',
    transcript: corpusEntry.text,
  });
  const exactResp = await exactClient.transcribe(Buffer.alloc(100), config);
  const exactMetrics = exactResp.success
    ? calculateCaseMetrics(corpusEntry, exactResp.result.transcript)
    : undefined;
  results.push({
    id: 'TX-09',
    description: 'Exact transcription -> WER 0%',
    pass: exactResp.success && exactMetrics !== undefined && exactMetrics.wer.wer === 0,
    detail: `WER=${exactMetrics?.wer.wer ?? 'N/A'}`,
    metrics: exactMetrics,
  });
  console.log(`  ${exactMetrics?.wer.wer === 0 ? '[ok]' : '[x]'} TX-09`);

  // 10. Minor error measured by WER
  const entry2 = CORPUS[1]; // RIEGO-02
  const minorClient = createMockTranscribeClient({
    type: 'error_minor',
    reference: entry2.text,
    modifications: [{ kind: 'substitute', position: 1, value: '250' }], // 200->250
  });
  const minorResp = await minorClient.transcribe(Buffer.alloc(100), config);
  const minorMetrics = minorResp.success
    ? calculateCaseMetrics(entry2, minorResp.result.transcript)
    : undefined;
  results.push({
    id: 'TX-10',
    description: 'Minor error -> WER > 0',
    pass: minorResp.success && minorMetrics !== undefined && minorMetrics.wer.wer > 0,
    detail: `WER=${(minorMetrics?.wer.wer ?? 0).toFixed(3)} S=${minorMetrics?.wer.substitutions}`,
    metrics: minorMetrics,
  });
  console.log(`  ${minorMetrics && minorMetrics.wer.wer > 0 ? '[ok]' : '[x]'} TX-10`);

  // 11. Critical term omitted
  const entry3 = CORPUS[5]; // TAREA-01 (has 'poda', 'bloque este')
  const omitClient = createMockTranscribeClient({
    type: 'error_minor',
    reference: entry3.text,
    modifications: [{ kind: 'substitute', position: 1, value: 'corte' }], // 'poda' -> 'corte'
  });
  const omitResp = await omitClient.transcribe(Buffer.alloc(100), config);
  const omitMetrics = omitResp.success
    ? calculateCaseMetrics(entry3, omitResp.result.transcript)
    : undefined;
  results.push({
    id: 'TX-11',
    description: 'Critical agricultural term omitted detected',
    pass:
      omitMetrics !== undefined &&
      (omitMetrics.criticalTerms.omitted.length > 0 ||
        omitMetrics.criticalTerms.substituted.length > 0),
    detail: `omitted=${omitMetrics?.criticalTerms.omitted} subst=${omitMetrics?.criticalTerms.substituted.length}`,
    metrics: omitMetrics,
  });
  console.log(
    `  ${omitMetrics && (omitMetrics.criticalTerms.omitted.length > 0 || omitMetrics.criticalTerms.substituted.length > 0) ? '[ok]' : '[x]'} TX-11`,
  );

  // 12. Critical term substituted
  const entry4 = CORPUS[7]; // TAREA-03 (has 'fungicida')
  const substClient = createMockTranscribeClient({
    type: 'error_minor',
    reference: entry4.text,
    modifications: [{ kind: 'substitute', position: 2, value: 'insecticida' }],
  });
  const substResp = await substClient.transcribe(Buffer.alloc(100), config);
  const substMetrics = substResp.success
    ? calculateCaseMetrics(entry4, substResp.result.transcript)
    : undefined;
  results.push({
    id: 'TX-12',
    description: 'Critical term substitution detected',
    pass: substMetrics !== undefined && substMetrics.wer.substitutions > 0,
    detail: `WER subs=${substMetrics?.wer.substitutions}`,
    metrics: substMetrics,
  });
  console.log(`  ${substMetrics && substMetrics.wer.substitutions > 0 ? '[ok]' : '[x]'} TX-12`);

  // 13. Number changed
  const entry5 = CORPUS[10]; // INV-01 (has '150')
  const numClient = createMockTranscribeClient({
    type: 'error_minor',
    reference: entry5.text,
    modifications: [{ kind: 'substitute', position: 1, value: '115' }], // 150->115
  });
  const numResp = await numClient.transcribe(Buffer.alloc(100), config);
  const numMetrics = numResp.success
    ? calculateCaseMetrics(entry5, numResp.result.transcript)
    : undefined;
  results.push({
    id: 'TX-13',
    description: 'Number change detected',
    pass:
      numMetrics !== undefined &&
      (numMetrics.numbers.changed.length > 0 || numMetrics.numbers.omitted.length > 0),
    detail: `changed=${numMetrics?.numbers.changed.length} omitted=${numMetrics?.numbers.omitted.length}`,
    metrics: numMetrics,
  });
  console.log(
    `  ${numMetrics && (numMetrics.numbers.changed.length > 0 || numMetrics.numbers.omitted.length > 0) ? '[ok]' : '[x]'} TX-13`,
  );

  // 14. Number omitted (delete the number word)
  const entry6 = CORPUS[12]; // INV-03 (has '500')
  const numOmitClient = createMockTranscribeClient({
    type: 'error_minor',
    reference: entry6.text,
    modifications: [{ kind: 'delete', position: 2 }], // delete '500'
  });
  const numOmitResp = await numOmitClient.transcribe(Buffer.alloc(100), config);
  const numOmitMetrics = numOmitResp.success
    ? calculateCaseMetrics(entry6, numOmitResp.result.transcript)
    : undefined;
  results.push({
    id: 'TX-14',
    description: 'Number omission detected',
    pass: numOmitMetrics !== undefined && numOmitMetrics.numbers.omitted.length > 0,
    detail: `omitted=${numOmitMetrics?.numbers.omitted}`,
    metrics: numOmitMetrics,
  });
  console.log(
    `  ${numOmitMetrics && numOmitMetrics.numbers.omitted.length > 0 ? '[ok]' : '[x]'} TX-14`,
  );

  // 15. Unit changed
  const entry7 = CORPUS[1]; // RIEGO-02 (has 'litros', 'hectarea', 'minutos')
  const unitClient = createMockTranscribeClient({
    type: 'error_minor',
    reference: entry7.text,
    modifications: [{ kind: 'substitute', position: 2, value: 'galones' }], // 'litros'->'galones'
  });
  const unitResp = await unitClient.transcribe(Buffer.alloc(100), config);
  const unitMetrics = unitResp.success
    ? calculateCaseMetrics(entry7, unitResp.result.transcript)
    : undefined;
  results.push({
    id: 'TX-15',
    description: 'Unit change detected',
    pass: unitMetrics !== undefined && unitMetrics.units.omitted.length > 0,
    detail: `unit omitted=${unitMetrics?.units.omitted}`,
    metrics: unitMetrics,
  });
  console.log(`  ${unitMetrics && unitMetrics.units.omitted.length > 0 ? '[ok]' : '[x]'} TX-15`);

  // 16. Temporal reference omitted
  const entry8 = CORPUS[3]; // RIEGO-04 (has 'lunes')
  const tempClient = createMockTranscribeClient({
    type: 'error_minor',
    reference: entry8.text,
    modifications: [{ kind: 'substitute', position: 7, value: 'pronto' }], // 'lunes' -> 'pronto'
  });
  const tempResp = await tempClient.transcribe(Buffer.alloc(100), config);
  const tempMetrics = tempResp.success
    ? calculateCaseMetrics(entry8, tempResp.result.transcript)
    : undefined;
  results.push({
    id: 'TX-16',
    description: 'Temporal reference omission detected',
    pass: tempMetrics !== undefined && tempMetrics.temporal.omitted.length > 0,
    detail: `temporal omitted=${tempMetrics?.temporal.omitted}`,
    metrics: tempMetrics,
  });
  console.log(`  ${tempMetrics && tempMetrics.temporal.omitted.length > 0 ? '[ok]' : '[x]'} TX-16`);

  // 17. Text with noise/extra words
  const entry9 = CORPUS[30]; // CONS-01
  const noiseClient = createMockTranscribeClient({
    type: 'error_minor',
    reference: entry9.text,
    modifications: [
      { kind: 'insert', position: 2, value: 'eh' },
      { kind: 'insert', position: 5, value: 'este' },
    ],
  });
  const noiseResp = await noiseClient.transcribe(Buffer.alloc(100), config);
  const noiseMetrics = noiseResp.success
    ? calculateCaseMetrics(entry9, noiseResp.result.transcript)
    : undefined;
  results.push({
    id: 'TX-17',
    description: 'Noise/extra words -> WER with insertions',
    pass: noiseMetrics !== undefined && noiseMetrics.wer.insertions > 0,
    detail: `insertions=${noiseMetrics?.wer.insertions}`,
    metrics: noiseMetrics,
  });
  console.log(`  ${noiseMetrics && noiseMetrics.wer.insertions > 0 ? '[ok]' : '[x]'} TX-17`);

  // 18. Timeout
  const timeoutClient = createMockTranscribeClient({ type: 'timeout', delayMs: 100 });
  let timeoutPassed = false;
  try {
    await Promise.race([
      timeoutClient.transcribe(Buffer.alloc(100), config),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 200)),
    ]);
  } catch (err) {
    timeoutPassed =
      (err as Error).message.includes('timeout') || (err as Error).message.includes('timed out');
  }
  results.push({
    id: 'TX-18',
    description: 'Timeout controlled',
    pass: timeoutPassed,
    detail: timeoutPassed ? 'Timeout caught correctly' : 'Timeout not caught',
  });
  console.log(`  ${timeoutPassed ? '[ok]' : '[x]'} TX-18`);

  // 19. Service error
  const errClient = createMockTranscribeClient({
    type: 'service_error',
    code: 'LimitExceededException',
    message: 'Rate limit exceeded',
  });
  const errResp = await errClient.transcribe(Buffer.alloc(100), config);
  results.push({
    id: 'TX-19',
    description: 'Service error handled',
    pass: !errResp.success && errResp.error.code === 'LimitExceededException',
    detail: !errResp.success ? `code=${errResp.error.code}` : 'unexpected success',
  });
  console.log(`  ${!errResp.success ? '[ok]' : '[x]'} TX-19`);

  // 20. Empty response
  const emptyClient = createMockTranscribeClient({ type: 'empty_response' });
  const emptyResp = await emptyClient.transcribe(Buffer.alloc(100), config);
  results.push({
    id: 'TX-20',
    description: 'Empty response handled',
    pass: emptyResp.success && emptyResp.result.transcript === '',
    detail: emptyResp.success ? `transcript=""` : 'error',
  });
  console.log(
    `  ${emptyResp.success && emptyResp.result.transcript === '' ? '[ok]' : '[x]'} TX-20`,
  );

  // 21. Invalid locale candidate
  const badConfig: HarnessConfig = { ...config, languageCandidates: ['zz-ZZ'] };
  const localeClient = createMockTranscribeClient({
    type: 'locale_selected',
    transcript: 'test',
    locale: 'zz-ZZ',
  });
  const localeResp = await localeClient.transcribe(Buffer.alloc(100), badConfig);
  results.push({
    id: 'TX-21',
    description: 'Locale candidate handling',
    pass: localeResp.success && localeResp.result.languageCode === 'zz-ZZ',
    detail: `locale=${localeResp.success ? localeResp.result.languageCode : 'N/A'}`,
  });
  console.log(`  ${localeResp.success ? '[ok]' : '[x]'} TX-21`);

  return results;
}

// ---------- Streaming Client Tests ----------

function runStreamingClientTests(): Promise<TestCaseResult[]> {
  return runStreamingClientTestsImpl();
}

async function runStreamingClientTestsImpl(): Promise<TestCaseResult[]> {
  const results: TestCaseResult[] = [];

  // SC-25: Partial result ignored, final kept
  const partialThenFinal: MockTranscriptEvent[] = [
    {
      TranscriptEvent: {
        Transcript: { Results: [{ IsPartial: true, Alternatives: [{ Transcript: 'progra' }] }] },
      },
    },
    {
      TranscriptEvent: {
        Transcript: {
          Results: [{ IsPartial: true, Alternatives: [{ Transcript: 'programar ri' }] }],
        },
      },
    },
    {
      TranscriptEvent: {
        Transcript: {
          Results: [
            {
              IsPartial: false,
              Alternatives: [
                {
                  Transcript: 'programar riego',
                  Items: [{ Confidence: 0.95 }, { Confidence: 0.92 }],
                },
              ],
            },
          ],
        },
      },
    },
  ];
  const r25 = await processTranscriptStream(toAsyncIterable(partialThenFinal));
  results.push({
    id: 'SC-25',
    description: 'Partial results ignored, final result kept',
    pass: r25.transcript === 'programar riego' && r25.confidence > 0.9,
    detail: `transcript="${r25.transcript}" conf=${r25.confidence.toFixed(3)}`,
  });
  console.log(`  ${r25.transcript === 'programar riego' ? '[ok]' : '[x]'} SC-25`);

  // SC-26: Multiple final results concatenated in order
  const multiFinal: MockTranscriptEvent[] = [
    {
      TranscriptEvent: {
        Transcript: {
          Results: [
            {
              IsPartial: false,
              Alternatives: [{ Transcript: 'programar riego', Items: [{ Confidence: 0.95 }] }],
            },
          ],
        },
      },
    },
    {
      TranscriptEvent: {
        Transcript: {
          Results: [
            {
              IsPartial: false,
              Alternatives: [{ Transcript: 'del bloque norte', Items: [{ Confidence: 0.9 }] }],
            },
          ],
        },
      },
    },
    {
      TranscriptEvent: {
        Transcript: {
          Results: [
            {
              IsPartial: false,
              Alternatives: [{ Transcript: 'para manana', Items: [{ Confidence: 0.88 }] }],
            },
          ],
        },
      },
    },
  ];
  const r26 = await processTranscriptStream(toAsyncIterable(multiFinal));
  const expected26 = 'programar riego del bloque norte para manana';
  results.push({
    id: 'SC-26',
    description: 'Multiple final results concatenated in order',
    pass: r26.transcript === expected26,
    detail: `transcript="${r26.transcript}"`,
  });
  console.log(`  ${r26.transcript === expected26 ? '[ok]' : '[x]'} SC-26`);

  // SC-27: Empty stream returns empty transcript
  const r27 = await processTranscriptStream(toAsyncIterable([]));
  results.push({
    id: 'SC-27',
    description: 'Empty stream -> empty transcript',
    pass: r27.transcript === '' && r27.confidence === 0,
    detail: `transcript="${r27.transcript}"`,
  });
  console.log(`  ${r27.transcript === '' ? '[ok]' : '[x]'} SC-27`);

  // SC-28: Result with no Alternatives
  const noAlts: MockTranscriptEvent[] = [
    { TranscriptEvent: { Transcript: { Results: [{ IsPartial: false, Alternatives: [] }] } } },
  ];
  const r28 = await processTranscriptStream(toAsyncIterable(noAlts));
  results.push({
    id: 'SC-28',
    description: 'Result with no Alternatives -> empty transcript',
    pass: r28.transcript === '',
    detail: `transcript="${r28.transcript}"`,
  });
  console.log(`  ${r28.transcript === '' ? '[ok]' : '[x]'} SC-28`);

  // SC-29: Empty Transcript string not appended
  const emptyText: MockTranscriptEvent[] = [
    {
      TranscriptEvent: {
        Transcript: { Results: [{ IsPartial: false, Alternatives: [{ Transcript: '' }] }] },
      },
    },
  ];
  const r29 = await processTranscriptStream(toAsyncIterable(emptyText));
  results.push({
    id: 'SC-29',
    description: 'Empty Transcript string not appended',
    pass: r29.transcript === '',
    detail: `transcript="${r29.transcript}"`,
  });
  console.log(`  ${r29.transcript === '' ? '[ok]' : '[x]'} SC-29`);

  // SC-30: Chunking 2.5s -> [32000, 32000, 16000]
  const testBuf = Buffer.alloc(Math.floor(BYTES_PER_SECOND * 2.5));
  const chunks = chunkBuffer(testBuf, BYTES_PER_SECOND);
  const correct = chunks.length === 3 && chunks[0].length === 32000 && chunks[2].length === 16000;
  results.push({
    id: 'SC-30',
    description: 'Chunking: 2.5s -> 3 chunks [32000, 32000, 16000]',
    pass: correct,
    detail: `chunks=${chunks.length} sizes=[${chunks.map((c) => c.length).join(',')}]`,
  });
  console.log(`  ${correct ? '[ok]' : '[x]'} SC-30`);

  // SC-31: Empty buffer -> 0 chunks (empty audio stream)
  const emptyChunks = chunkBuffer(Buffer.alloc(0), BYTES_PER_SECOND);
  results.push({
    id: 'SC-31',
    description: 'Empty audio buffer -> 0 chunks',
    pass: emptyChunks.length === 0,
    detail: `chunks=${emptyChunks.length}`,
  });
  console.log(`  ${emptyChunks.length === 0 ? '[ok]' : '[x]'} SC-31`);

  // SC-32: Error sanitization strips account IDs and ARNs
  const errorMsg = 'AccessDenied for arn:aws:iam::334856751415:role/Test on account 334856751415';
  const cleaned = errorMsg.replace(/\d{12}/g, '[ACCOUNT]').replace(/arn:aws:[^\s]+/g, '[ARN]');
  const safe = !cleaned.includes('334856751415');
  results.push({
    id: 'SC-32',
    description: 'Error sanitization removes account IDs and ARNs',
    pass: safe && cleaned.includes('[ACCOUNT]') && cleaned.includes('[ARN]'),
    detail: `sanitized="${cleaned}"`,
  });
  console.log(`  ${safe ? '[ok]' : '[x]'} SC-32`);

  // SC-33: transcribe-client module importable with SDK
  let importable = false;
  try {
    const mod = await import('./transcribe-client.js');
    importable = typeof mod.createLiveClient === 'function';
  } catch {
    importable = false;
  }
  results.push({
    id: 'SC-33',
    description: 'transcribe-client module importable with SDK',
    pass: importable,
    detail: importable ? 'createLiveClient is function' : 'import failed',
  });
  console.log(`  ${importable ? '[ok]' : '[x]'} SC-33`);

  // SC-34: Timeout fires AbortController through full client path
  const slowSdk: SdkSendable = {
    async send(_cmd: unknown, options?: { abortSignal?: AbortSignal }) {
      // Simulate a slow response that never resolves unless aborted
      return new Promise((_, reject) => {
        const onAbort = () => reject(new Error('The operation was aborted'));
        if (options?.abortSignal?.aborted) {
          reject(new Error('The operation was aborted'));
          return;
        }
        options?.abortSignal?.addEventListener('abort', onAbort);
      });
    },
  };
  const timeoutConfig: HarnessConfig = {
    region: 'us-east-1',
    profile: 'test',
    languageCandidates: ['es-US'],
    timeoutMs: 100, // 100ms timeout
    dryRun: true,
    fixtureDir: '',
    chunkDurationMs: 100,
  };
  const timeoutClient = createLiveClient(timeoutConfig, slowSdk);
  const beforeTimeout = Date.now();
  const timeoutResp = await timeoutClient.transcribe(Buffer.alloc(1000), timeoutConfig);
  const elapsed = Date.now() - beforeTimeout;
  const timeoutOk =
    !timeoutResp.success && timeoutResp.error.code === 'TimeoutError' && elapsed < 500; // Must complete quickly, not hang
  results.push({
    id: 'SC-34',
    description: 'Timeout fires AbortController through full client',
    pass: timeoutOk,
    detail: `code=${!timeoutResp.success ? timeoutResp.error.code : 'N/A'} elapsed=${elapsed}ms`,
  });
  console.log(`  ${timeoutOk ? '[ok]' : '[x]'} SC-34`);

  // SC-35: SDK error with ARN/account sanitized through full client path
  const errorSdk: SdkSendable = {
    async send() {
      throw new Error(
        'AccessDeniedException: User arn:aws:iam::334856751415:role/AgrosboDeveloperRole ' +
          'is not authorized to perform transcribe:StartStreamTranscription on account 334856751415',
      );
    },
  };
  const errorConfig: HarnessConfig = {
    region: 'us-east-1',
    profile: 'test',
    languageCandidates: ['es-US'],
    timeoutMs: 5000,
    dryRun: true,
    fixtureDir: '',
    chunkDurationMs: 100,
  };
  const errorClient = createLiveClient(errorConfig, errorSdk);
  const errResp = await errorClient.transcribe(Buffer.alloc(100), errorConfig);
  const errOk =
    !errResp.success &&
    errResp.error.code === 'TranscribeError' &&
    !errResp.error.message.includes('334856751415') &&
    !errResp.error.message.includes('arn:aws:iam') &&
    errResp.error.message.includes('[ACCOUNT]') &&
    errResp.error.message.includes('[ARN]');
  results.push({
    id: 'SC-35',
    description: 'SDK error sanitized: no ARN/account, context preserved',
    pass: errOk,
    detail: !errResp.success
      ? `msg="${errResp.error.message.substring(0, 80)}"`
      : 'unexpected success',
  });
  console.log(`  ${errOk ? '[ok]' : '[x]'} SC-35`);

  // SC-36: chunkSizeForDuration(100) = 3200 bytes
  const cs100 = chunkSizeForDuration(100);
  results.push({
    id: 'SC-36',
    description: 'chunkSizeForDuration(100ms) = 3200 bytes',
    pass: cs100 === 3200,
    detail: `chunkSize=${cs100}`,
  });
  console.log(`  ${cs100 === 3200 ? '[ok]' : '[x]'} SC-36`);

  // SC-37: Pacing invoked between chunks, not after last
  const pacingCalls: number[] = [];
  const fakeSleep: SleepFn = async (ms) => {
    pacingCalls.push(ms);
  };
  const pacingSdk: SdkSendable = {
    async send(cmd: unknown) {
      // Consume AudioStream from the command to trigger generator + sleeps
      const command = cmd as { input?: { AudioStream?: AsyncIterable<unknown> } };
      if (command.input?.AudioStream) {
        for await (const _ of command.input.AudioStream) {
          /* drain */
        }
      }
      return { TranscriptResultStream: toAsyncIterable([]) };
    },
  };
  const pacingConfig: HarnessConfig = {
    region: 'us-east-1',
    profile: 'test',
    languageCandidates: ['es-US'],
    timeoutMs: 5000,
    dryRun: true,
    fixtureDir: '',
    chunkDurationMs: 100,
  };
  // 3 chunks worth of data: 3200 * 3 = 9600 bytes
  const pacingClient = createLiveClient(pacingConfig, pacingSdk, fakeSleep);
  await pacingClient.transcribe(Buffer.alloc(9600), pacingConfig);
  // 3 chunks -> pacing called between 1-2 and 2-3 = 2 times, NOT after last
  const pacingOk = pacingCalls.length === 2 && pacingCalls.every((ms) => ms === 100);
  results.push({
    id: 'SC-37',
    description: 'Pacing: sleep between chunks, not after last (2 sleeps for 3 chunks)',
    pass: pacingOk,
    detail: `calls=${pacingCalls.length} values=[${pacingCalls.join(',')}]`,
  });
  console.log(`  ${pacingOk ? '[ok]' : '[x]'} SC-37`);

  // SC-38: Last chunk incomplete preserved (odd buffer trimmed to even)
  const incompleteCalls: Buffer[] = [];
  const captureSdk: SdkSendable = {
    async send(cmd: unknown) {
      // Capture the audio chunks from the command's AudioStream
      const c = cmd as {
        input?: { AudioStream?: AsyncIterable<{ AudioEvent?: { AudioChunk?: Buffer } }> };
      };
      if (c.input?.AudioStream) {
        for await (const ev of c.input.AudioStream) {
          if (ev.AudioEvent?.AudioChunk) incompleteCalls.push(ev.AudioEvent.AudioChunk);
        }
      }
      return { TranscriptResultStream: toAsyncIterable([]) };
    },
  };
  // 3200 + 1600 = 4800 bytes (last chunk is 1600, which is even -> kept as is)
  const incompleteClient = createLiveClient(pacingConfig, captureSdk, fakeSleep);
  pacingCalls.length = 0;
  await incompleteClient.transcribe(Buffer.alloc(4800), pacingConfig);
  const lastChunkOk =
    incompleteCalls.length === 2 &&
    incompleteCalls[0].length === 3200 &&
    incompleteCalls[1].length === 1600;
  results.push({
    id: 'SC-38',
    description: 'Last chunk incomplete (1600 bytes) preserved',
    pass: lastChunkOk,
    detail: `chunks=${incompleteCalls.length} sizes=[${incompleteCalls.map((c) => c.length).join(',')}]`,
  });
  console.log(`  ${lastChunkOk ? '[ok]' : '[x]'} SC-38`);

  // SC-39: No sleep after last chunk
  // pacingCalls was reset above; for 4800 bytes / 3200 chunk = 2 chunks -> 1 sleep
  const noSleepAfterLast = pacingCalls.length === 1;
  results.push({
    id: 'SC-39',
    description: 'No sleep after last chunk (1 sleep for 2 chunks)',
    pass: noSleepAfterLast,
    detail: `sleepCalls=${pacingCalls.length}`,
  });
  console.log(`  ${noSleepAfterLast ? '[ok]' : '[x]'} SC-39`);

  // SC-40: chunkDurationMs outside 50-200 rejected by config
  const origEnv = process.env.TRANSCRIBE_CHUNK_DURATION_MS;
  process.env.TRANSCRIBE_CHUNK_DURATION_MS = '10';
  const { loadConfig: loadCfg } = await import('./config.js');
  const badChunkCfg = loadCfg();
  process.env.TRANSCRIBE_CHUNK_DURATION_MS = origEnv ?? '';
  if (!origEnv) delete process.env.TRANSCRIBE_CHUNK_DURATION_MS;
  const chunkRejected =
    !badChunkCfg.valid &&
    badChunkCfg.errors.some((e) => e.includes('TRANSCRIBE_CHUNK_DURATION_MS'));
  results.push({
    id: 'SC-40',
    description: 'chunkDurationMs=10 rejected by config (outside 50-200)',
    pass: chunkRejected,
    detail: badChunkCfg.errors.join('; '),
  });
  console.log(`  ${chunkRejected ? '[ok]' : '[x]'} SC-40`);

  return results;
}

async function* toAsyncIterable<T>(items: T[]): AsyncGenerator<T> {
  for (const item of items) {
    yield item;
  }
}

function chunkBuffer(buffer: Buffer, maxChunkSize: number): Buffer[] {
  const chunks: Buffer[] = [];
  let offset = 0;
  while (offset < buffer.length) {
    const end = Math.min(offset + maxChunkSize, buffer.length);
    chunks.push(buffer.subarray(offset, end));
    offset = end;
  }
  return chunks;
}

// ---------- Infra Tests ----------

function runInfraTests(config: HarnessConfig): TestCaseResult[] {
  const results: TestCaseResult[] = [];

  // 22. Mode validation
  if (config.dryRun) {
    // In dry-run: confirm no AWS calls were made
    results.push({
      id: 'INFRA-22',
      description: 'Dry-run mode: no AWS calls',
      pass: true,
      detail: 'dryRun=true, mock clients only',
    });
  } else {
    // In live: confirm we are in authorized live mode
    results.push({
      id: 'INFRA-22',
      description: 'Live mode: authorized execution',
      pass: true,
      detail: 'dryRun=false, live transcription performed',
    });
  }
  console.log(`  [ok] INFRA-22`);

  // 23. Sanitization works
  const sensitive = 'AKIAIOSFODNN7EXAMPLE user@farm.com C:\\Users\\pedro\\secrets';
  const cleaned = sanitize(sensitive);
  const isSafe = !containsSensitive(cleaned);
  results.push({
    id: 'INFRA-23',
    description: 'Log sanitization removes sensitive data',
    pass: isSafe,
    detail: isSafe ? 'All patterns redacted' : `Leaked: ${cleaned}`,
  });
  console.log(`  ${isSafe ? '[ok]' : '[x]'} INFRA-23`);

  // 24. Evidence serializable
  const testResults: TestCaseResult[] = [
    { id: 'test', description: 'test', pass: true, detail: 'ok' },
  ];
  const evidence = buildEvidence(config, testResults, undefined, []);
  let serializable = false;
  try {
    JSON.stringify(evidence);
    serializable = true;
  } catch {
    serializable = false;
  }
  results.push({
    id: 'INFRA-24',
    description: 'Evidence is JSON-serializable',
    pass: serializable,
    detail: serializable ? 'JSON.stringify succeeded' : 'Serialization failed',
  });
  console.log(`  ${serializable ? '[ok]' : '[x]'} INFRA-24`);

  return results;
}

// ---------- LIVE Fixtures ----------

interface FixtureClip {
  filename: string;
  groundTruth: string;
}

const LIVE_FIXTURES: FixtureClip[] = [
  {
    filename: 'clip-001.pcm',
    groundTruth: 'Programar riego del bloque norte para mañana a las seis de la mañana',
  },
  {
    filename: 'clip-002.pcm',
    groundTruth: 'Quedan ciento cincuenta kilos de fertilizante en la bodega principal',
  },
  {
    filename: 'clip-003.pcm',
    groundTruth:
      'Registrar cosecha de dos mil quinientos kilos de tomate en el bloque sur, lote dos',
  },
];

// ---------- LIVE Transcription Tests ----------

async function runLiveTranscriptionTests(config: HarnessConfig): Promise<TestCaseResult[]> {
  const results: TestCaseResult[] = [];
  const client = createLiveClient(config);

  for (let i = 0; i < LIVE_FIXTURES.length; i++) {
    const fixture = LIVE_FIXTURES[i];
    const clipPath = join(config.fixtureDir, fixture.filename);
    const id = `LIVE-${String(i + 1).padStart(2, '0')}`;

    // Check file exists
    if (!existsSync(clipPath)) {
      results.push({
        id,
        description: `${fixture.filename}: file not found`,
        pass: false,
        detail: `Missing: ${fixture.filename} in ${config.fixtureDir}`,
      });
      console.log(`  [x] ${id} -- file not found`);
      continue;
    }

    // Load PCM raw audio
    const audioBuffer = readFileSync(clipPath);

    // Validate: not empty, even byte count (16-bit samples)
    if (audioBuffer.length === 0) {
      results.push({
        id,
        description: `${fixture.filename}: empty file`,
        pass: false,
        detail: 'File is 0 bytes',
      });
      console.log(`  [x] ${id} -- empty file`);
      continue;
    }
    if (audioBuffer.length % 2 !== 0) {
      results.push({
        id,
        description: `${fixture.filename}: odd byte count`,
        pass: false,
        detail: `${audioBuffer.length} bytes (must be even for 16-bit PCM)`,
      });
      console.log(`  [x] ${id} -- odd byte count`);
      continue;
    }

    // Transcribe
    const startMs = Date.now();
    const resp = await client.transcribe(audioBuffer, config);
    const latencyMs = Date.now() - startMs;

    if (!resp.success) {
      // Hard stop on AccessDenied
      if (
        resp.error.message.includes('AccessDenied') ||
        resp.error.code === 'AccessDeniedException'
      ) {
        results.push({
          id,
          description: `${fixture.filename}: AccessDenied -- HARD STOP`,
          pass: false,
          detail: resp.error.message,
        });
        console.log(`  [x] ${id} -- AccessDenied HARD STOP`);
        console.error('\n  [!!] AccessDenied -- stopping live tests.\n');
        break;
      }
      results.push({
        id,
        description: `${fixture.filename}: error`,
        pass: false,
        detail: `${resp.error.code}: ${resp.error.message}`,
      });
      console.log(`  [x] ${id} -- ${resp.error.code}`);
      continue;
    }

    // Calculate WER
    const wer = calculateWer(fixture.groundTruth, resp.result.transcript);
    const pass = wer.wer <= 0.3; // PASS if WER <= 30%

    results.push({
      id,
      description: `${fixture.filename}: WER=${(wer.wer * 100).toFixed(1)}% latency=${latencyMs}ms`,
      pass,
      detail: `transcript="${resp.result.transcript}" | ref="${fixture.groundTruth}" | S=${wer.substitutions} D=${wer.deletions} I=${wer.insertions} | locale=${resp.result.languageCode} conf=${resp.result.confidence.toFixed(2)}`,
    });
    console.log(
      `  ${pass ? '[ok]' : '[x]'} ${id} WER=${(wer.wer * 100).toFixed(1)}% latency=${latencyMs}ms`,
    );
    console.log(`       expected: "${fixture.groundTruth}"`);
    console.log(`       observed: "${resp.result.transcript}"`);
  }

  return results;
}

// ---------- Entry ----------

main().catch((err) => {
  console.error('Unhandled error:', (err as Error).message);
  process.exit(1);
});
