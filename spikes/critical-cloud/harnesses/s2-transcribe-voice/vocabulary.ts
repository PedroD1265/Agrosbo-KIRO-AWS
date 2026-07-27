/**
 * S2 Harness -- Vocabulario Agricola Candidato
 *
 * Local candidate vocabulary for Custom Vocabulary evaluation.
 * This is NOT definitive and NOT deployed to AWS.
 * Purpose: measure critical term recognition in dry-run metrics.
 *
 * DISPOSABLE -- not production code.
 */

import type { VocabularyEntry } from './types.js';

/**
 * Candidate vocabulary entries.
 * Each entry can optionally include SoundsLike hints and DisplayAs overrides
 * for future Custom Vocabulary creation in T11.
 */
export const VOCABULARY: VocabularyEntry[] = [
  // Locations
  { phrase: 'bloque', soundsLike: ['bloke'] },
  { phrase: 'sector' },
  { phrase: 'invernadero', soundsLike: ['inbernadero'] },
  { phrase: 'lote' },

  // Operations
  { phrase: 'riego' },
  { phrase: 'fumigacion', displayAs: 'fumigacion', soundsLike: ['fumigasion'] },
  { phrase: 'fungicida' },
  { phrase: 'herbicida' },
  { phrase: 'fertilizante' },
  { phrase: 'cosecha' },
  { phrase: 'siembra' },
  { phrase: 'drenaje' },
  { phrase: 'floracion', displayAs: 'floracion', soundsLike: ['florasion'] },
  { phrase: 'apicultura' },
  { phrase: 'insecticida' },
  { phrase: 'poda' },

  // Crops
  { phrase: 'maiz', displayAs: 'maiz' },
  { phrase: 'tomate' },
  { phrase: 'lechuga' },
  { phrase: 'pimiento' },
  { phrase: 'pepino' },
  { phrase: 'frijol' },

  // Agricultural terms from corpus
  { phrase: 'riego por goteo' },
  { phrase: 'mosca blanca' },
  { phrase: 'saturacion' },
  { phrase: 'rendimiento' },
  { phrase: 'nitrogeno' },
  { phrase: 'deficiencia' },

  // Units (context-sensitive)
  { phrase: 'hectareas', soundsLike: ['ectareas'] },
  { phrase: 'kilogramos' },
];

/**
 * Returns vocabulary phrases as a simple string set for matching.
 */
export function getVocabularyTerms(): Set<string> {
  return new Set(VOCABULARY.map((v) => v.phrase.toLowerCase()));
}

/**
 * Returns the full vocabulary list for reporting.
 */
export function getVocabularyEntries(): VocabularyEntry[] {
  return [...VOCABULARY];
}
