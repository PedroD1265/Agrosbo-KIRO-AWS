/**
 * S2 Harness -- Text Normalizer
 *
 * Normalizes transcription output and reference text for fair WER comparison.
 *
 * Transformations applied:
 * - Lowercase
 * - Remove punctuation (.,;:!?()[]{}/"')
 * - Collapse multiple spaces to single space
 * - Trim leading/trailing whitespace
 *
 * Transformations NOT applied (to avoid hiding errors):
 * - Accent removal (accents matter for Spanish)
 * - Number-to-word conversion (numbers must match)
 * - Unit abbreviation expansion
 * - Spelling correction
 *
 * DISPOSABLE -- not production code.
 */

const PUNCTUATION_PATTERN = /[.,;:!?()[\]{}"']/g;
const MULTI_SPACE_PATTERN = /\s+/g;

/**
 * Normalizes text for WER comparison.
 */
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(PUNCTUATION_PATTERN, '')
    .replace(MULTI_SPACE_PATTERN, ' ')
    .trim();
}

/**
 * Splits normalized text into word tokens.
 */
export function tokenize(text: string): string[] {
  const normalized = normalize(text);
  if (normalized.length === 0) return [];
  return normalized.split(' ');
}

/**
 * Documents the normalization rules for evidence.
 */
export function getNormalizationRules(): string[] {
  return [
    'lowercase: applied',
    'punctuation (.,;:!?()[]{}/"\'): removed',
    'multiple spaces: collapsed to single',
    'trim: applied',
    'accents: preserved (NOT removed)',
    'numbers written vs digits: NOT equated (must match exactly)',
    'unit abbreviations: NOT expanded (must match exactly)',
    'spelling correction: NOT applied',
  ];
}
