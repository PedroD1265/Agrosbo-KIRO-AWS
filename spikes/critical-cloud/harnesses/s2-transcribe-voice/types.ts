/**
 * S2 Harness -- Types
 *
 * Shared type definitions for the Transcribe voice harness.
 * DISPOSABLE -- not production code.
 */

// ---------- Configuration ----------

export interface HarnessConfig {
  region: string;
  profile: string;
  languageCandidates: string[];
  timeoutMs: number;
  dryRun: boolean;
  fixtureDir: string;
  chunkDurationMs: number;
}

// ---------- Audio validation ----------

export interface WavHeader {
  codec: 'pcm' | 'unknown';
  channels: number;
  sampleRate: number;
  bitsPerSample: number;
  dataSize: number;
  durationMs: number;
}

export interface AudioValidationResult {
  valid: boolean;
  errors: string[];
  header?: WavHeader;
}

// ---------- Corpus ----------

export type CorpusCategory =
  | 'riego'
  | 'tareas'
  | 'inventario'
  | 'cosecha'
  | 'siembra'
  | 'observaciones'
  | 'consultas'
  | 'confirmaciones'
  | 'cancelaciones';

export interface CriticalTerm {
  term: string;
  type: 'agricultural' | 'unit' | 'number' | 'temporal' | 'location';
}

export interface CorpusEntry {
  id: string;
  category: CorpusCategory;
  text: string;
  criticalTerms: CriticalTerm[];
  expectedNumbers: string[];
  expectedUnits: string[];
  expectedTemporalRefs: string[];
}

// ---------- Vocabulary ----------

export interface VocabularyEntry {
  phrase: string;
  soundsLike?: string[];
  displayAs?: string;
}

// ---------- Metrics ----------

export interface WerDetail {
  substitutions: number;
  deletions: number;
  insertions: number;
  totalReferenceWords: number;
  wer: number;
}

export interface CriticalTermMetrics {
  expected: string[];
  detected: string[];
  omitted: string[];
  substituted: Array<{ expected: string; got: string }>;
  coveragePercent: number;
}

export interface NumberMetrics {
  expected: string[];
  detected: string[];
  changed: Array<{ expected: string; got: string }>;
  omitted: string[];
}

export interface UnitMetrics {
  expected: string[];
  detected: string[];
  omitted: string[];
}

export interface TemporalMetrics {
  expected: string[];
  detected: string[];
  omitted: string[];
}

export interface CaseMetrics {
  wer: WerDetail;
  criticalTerms: CriticalTermMetrics;
  numbers: NumberMetrics;
  units: UnitMetrics;
  temporal: TemporalMetrics;
}

export interface AggregateMetrics {
  totalCases: number;
  averageWer: number;
  criticalTermCoverage: number;
  numberAccuracy: number;
  unitAccuracy: number;
  temporalAccuracy: number;
}

// ---------- Transcribe client ----------

export interface TranscribeResult {
  transcript: string;
  confidence: number;
  languageCode: string;
  durationMs: number;
}

export interface TranscribeError {
  code: string;
  message: string;
}

export type TranscribeResponse =
  { success: true; result: TranscribeResult } | { success: false; error: TranscribeError };

// ---------- Test cases ----------

export interface TestCaseResult {
  id: string;
  description: string;
  pass: boolean;
  detail: string;
  metrics?: CaseMetrics;
  durationMs?: number;
}

// ---------- Evidence ----------

export interface ExecutionEvidence {
  timestamp: string;
  harnessVersion: string;
  mode: 'dry-run' | 'live';
  region: string;
  languageCandidates: string[];
  casesExecuted: number;
  results: TestCaseResult[];
  aggregateMetrics?: AggregateMetrics;
  sanitizedErrors: string[];
  zeroAwsCalls: boolean;
  verdict: 'PASS' | 'PARTIAL' | 'FAIL';
}
