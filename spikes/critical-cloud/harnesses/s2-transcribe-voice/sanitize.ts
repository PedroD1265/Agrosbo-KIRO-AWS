/**
 * S2 Harness -- Log Sanitization
 *
 * Ensures no sensitive content appears in logs:
 * - No audio buffers
 * - No credentials
 * - No personal paths
 * - No emails or account IDs
 *
 * DISPOSABLE -- not production code.
 */

const SENSITIVE_PATTERNS: Array<{ pattern: RegExp; replacement: string }> = [
  { pattern: /AKIA[0-9A-Z]{16}/g, replacement: '[REDACTED_KEY]' },
  { pattern: /(?:password|secret|token|api[_-]?key)\s*[=:]\s*\S+/gi, replacement: '[REDACTED]' },
  { pattern: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, replacement: '[REDACTED_EMAIL]' },
  { pattern: /\d{12}/g, replacement: '[REDACTED_ACCOUNT]' },
  { pattern: /[A-Z]:\\Users\\[^\s\\]+/gi, replacement: '[REDACTED_PATH]' },
  { pattern: /\/home\/[^\s/]+/g, replacement: '[REDACTED_PATH]' },
  { pattern: /<Buffer[^>]*>/g, replacement: '[BINARY_DATA]' },
];

export function sanitize(input: string): string {
  let result = input;
  for (const { pattern, replacement } of SENSITIVE_PATTERNS) {
    pattern.lastIndex = 0;
    result = result.replace(pattern, replacement);
  }
  return result;
}

export function containsSensitive(input: string): boolean {
  for (const { pattern } of SENSITIVE_PATTERNS) {
    pattern.lastIndex = 0;
    if (pattern.test(input)) return true;
  }
  return false;
}

/**
 * Safe log for test case result -- no binary data, no full paths.
 */
export function safeCaseLog(id: string, pass: boolean, detail: string): string {
  return `[${id}] ${pass ? 'PASS' : 'FAIL'} ${sanitize(detail).substring(0, 150)}`;
}
