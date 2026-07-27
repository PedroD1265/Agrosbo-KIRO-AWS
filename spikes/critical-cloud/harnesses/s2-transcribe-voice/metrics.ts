/**
 * S2 Harness -- Metrics Calculation
 *
 * Implements WER, critical term coverage, number/unit/temporal accuracy.
 *
 * DISPOSABLE -- not production code.
 */

import type {
  WerDetail,
  CriticalTermMetrics,
  NumberMetrics,
  UnitMetrics,
  TemporalMetrics,
  CaseMetrics,
  AggregateMetrics,
  CorpusEntry,
  TestCaseResult,
} from './types.js';
import { tokenize, normalize } from './text-normalizer.js';

// ---------- Word Error Rate ----------

/**
 * Calculates WER using minimum edit distance (Levenshtein on word tokens).
 * WER = (S + D + I) / N where N = total reference words.
 */
export function calculateWer(reference: string, hypothesis: string): WerDetail {
  const ref = tokenize(reference);
  const hyp = tokenize(hypothesis);

  const n = ref.length;
  const m = hyp.length;

  if (n === 0) {
    return {
      substitutions: 0,
      deletions: 0,
      insertions: m,
      totalReferenceWords: 0,
      wer: m > 0 ? 1 : 0,
    };
  }

  // DP table for edit distance
  const dp: number[][] = Array.from({ length: n + 1 }, () => Array(m + 1).fill(0));

  for (let i = 0; i <= n; i++) dp[i][0] = i;
  for (let j = 0; j <= m; j++) dp[0][j] = j;

  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      if (ref[i - 1] === hyp[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // Backtrace to count S, D, I
  let i = n;
  let j = m;
  let substitutions = 0;
  let deletions = 0;
  let insertions = 0;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && ref[i - 1] === hyp[j - 1]) {
      i--;
      j--;
    } else if (i > 0 && j > 0 && dp[i][j] === dp[i - 1][j - 1] + 1) {
      substitutions++;
      i--;
      j--;
    } else if (i > 0 && dp[i][j] === dp[i - 1][j] + 1) {
      deletions++;
      i--;
    } else {
      insertions++;
      j--;
    }
  }

  const wer = n > 0 ? (substitutions + deletions + insertions) / n : 0;

  return { substitutions, deletions, insertions, totalReferenceWords: n, wer };
}

// ---------- Critical terms ----------

/**
 * Evaluates critical term detection in hypothesis text.
 */
export function evaluateCriticalTerms(entry: CorpusEntry, hypothesis: string): CriticalTermMetrics {
  const normalizedHyp = normalize(hypothesis);
  const expected = entry.criticalTerms.map((t) => t.term.toLowerCase());
  const detected: string[] = [];
  const omitted: string[] = [];
  const substituted: Array<{ expected: string; got: string }> = [];

  for (const term of expected) {
    if (normalizedHyp.includes(term)) {
      detected.push(term);
    } else {
      // Check for partial match (possible substitution)
      const words = term.split(' ');
      const partialMatch = words.some((w) => normalizedHyp.includes(w));
      if (partialMatch) {
        substituted.push({ expected: term, got: '[partial]' });
      } else {
        omitted.push(term);
      }
    }
  }

  const coveragePercent = expected.length > 0 ? (detected.length / expected.length) * 100 : 100;

  return { expected, detected, omitted, substituted, coveragePercent };
}

// ---------- Numbers ----------

export function evaluateNumbers(entry: CorpusEntry, hypothesis: string): NumberMetrics {
  const normalizedHyp = normalize(hypothesis);
  const expected = entry.expectedNumbers;
  const detected: string[] = [];
  const changed: Array<{ expected: string; got: string }> = [];
  const omitted: string[] = [];

  for (const num of expected) {
    if (normalizedHyp.includes(num)) {
      detected.push(num);
    } else {
      // Check if a different number appears nearby (heuristic)
      const numbers = normalizedHyp.match(/\d+/g) || [];
      const close = numbers.find(
        (n) => Math.abs(parseInt(n) - parseInt(num)) < parseInt(num) * 0.2,
      );
      if (close) {
        changed.push({ expected: num, got: close });
      } else {
        omitted.push(num);
      }
    }
  }

  return { expected, detected, changed, omitted };
}

// ---------- Units ----------

export function evaluateUnits(entry: CorpusEntry, hypothesis: string): UnitMetrics {
  const normalizedHyp = normalize(hypothesis);
  const expected = entry.expectedUnits;
  const detected: string[] = [];
  const omitted: string[] = [];

  for (const unit of expected) {
    if (normalizedHyp.includes(unit.toLowerCase())) {
      detected.push(unit);
    } else {
      omitted.push(unit);
    }
  }

  return { expected, detected, omitted };
}

// ---------- Temporal references ----------

export function evaluateTemporal(entry: CorpusEntry, hypothesis: string): TemporalMetrics {
  const normalizedHyp = normalize(hypothesis);
  const expected = entry.expectedTemporalRefs;
  const detected: string[] = [];
  const omitted: string[] = [];

  for (const ref of expected) {
    if (normalizedHyp.includes(ref.toLowerCase())) {
      detected.push(ref);
    } else {
      omitted.push(ref);
    }
  }

  return { expected, detected, omitted };
}

// ---------- Full case metrics ----------

export function calculateCaseMetrics(entry: CorpusEntry, hypothesis: string): CaseMetrics {
  return {
    wer: calculateWer(entry.text, hypothesis),
    criticalTerms: evaluateCriticalTerms(entry, hypothesis),
    numbers: evaluateNumbers(entry, hypothesis),
    units: evaluateUnits(entry, hypothesis),
    temporal: evaluateTemporal(entry, hypothesis),
  };
}

// ---------- Aggregate ----------

export function calculateAggregateMetrics(results: TestCaseResult[]): AggregateMetrics {
  const withMetrics = results.filter((r) => r.metrics);
  const totalCases = withMetrics.length;

  if (totalCases === 0) {
    return {
      totalCases: 0,
      averageWer: 0,
      criticalTermCoverage: 0,
      numberAccuracy: 0,
      unitAccuracy: 0,
      temporalAccuracy: 0,
    };
  }

  let totalWer = 0;
  let totalCriticalExpected = 0;
  let totalCriticalDetected = 0;
  let totalNumbersExpected = 0;
  let totalNumbersDetected = 0;
  let totalUnitsExpected = 0;
  let totalUnitsDetected = 0;
  let totalTemporalExpected = 0;
  let totalTemporalDetected = 0;

  for (const r of withMetrics) {
    const m = r.metrics!;
    totalWer += m.wer.wer;
    totalCriticalExpected += m.criticalTerms.expected.length;
    totalCriticalDetected += m.criticalTerms.detected.length;
    totalNumbersExpected += m.numbers.expected.length;
    totalNumbersDetected += m.numbers.detected.length;
    totalUnitsExpected += m.units.expected.length;
    totalUnitsDetected += m.units.detected.length;
    totalTemporalExpected += m.temporal.expected.length;
    totalTemporalDetected += m.temporal.detected.length;
  }

  return {
    totalCases,
    averageWer: totalWer / totalCases,
    criticalTermCoverage:
      totalCriticalExpected > 0 ? (totalCriticalDetected / totalCriticalExpected) * 100 : 100,
    numberAccuracy:
      totalNumbersExpected > 0 ? (totalNumbersDetected / totalNumbersExpected) * 100 : 100,
    unitAccuracy: totalUnitsExpected > 0 ? (totalUnitsDetected / totalUnitsExpected) * 100 : 100,
    temporalAccuracy:
      totalTemporalExpected > 0 ? (totalTemporalDetected / totalTemporalExpected) * 100 : 100,
  };
}
