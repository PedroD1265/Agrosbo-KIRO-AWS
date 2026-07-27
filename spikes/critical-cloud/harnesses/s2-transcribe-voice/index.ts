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
import { calculateCaseMetrics, calculateAggregateMetrics } from './metrics.js';
import { createMockTranscribeClient } from './mock-transcribe-client.js';
import { sanitize, containsSensitive } from './sanitize.js';
import { buildEvidence, printEvidence } from './evidence.js';
import type { TestCaseResult, HarnessConfig } from './types.js';

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

  // ---------- Infrastructure Tests ----------
  console.log('\n> Infrastructure Tests\n');
  results.push(...runInfraTests(config));

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

// ---------- Infrastructure Tests ----------

function runInfraTests(config: HarnessConfig): TestCaseResult[] {
  const results: TestCaseResult[] = [];

  // 22. Dry-run without AWS
  results.push({
    id: 'INFRA-22',
    description: 'Dry-run mode: no AWS calls',
    pass: config.dryRun === true,
    detail: `dryRun=${config.dryRun}`,
  });
  console.log(`  ${config.dryRun ? '[ok]' : '[x]'} INFRA-22`);

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

// ---------- Entry ----------

main().catch((err) => {
  console.error('Unhandled error:', (err as Error).message);
  process.exit(1);
});
