/**
 * S3 Harness -- Log Sanitization
 *
 * DISPOSABLE -- not production code.
 */

const SENSITIVE_PATTERNS: Array<{ pattern: RegExp; replacement: string }> = [
  { pattern: /AKIA[0-9A-Z]{16}/g, replacement: '[REDACTED_KEY]' },
  { pattern: /(?:password|secret|token|api[_-]?key)\s*[=:]\s*\S+/gi, replacement: '[REDACTED]' },
  { pattern: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, replacement: '[REDACTED_EMAIL]' },
  { pattern: /\d{12}/g, replacement: '[REDACTED_ACCOUNT]' },
  { pattern: /arn:aws:[^:\s]+:\w+-\w+-\d:\d{12}:[^\s"]+/g, replacement: '[REDACTED_ARN]' },
  { pattern: /[A-Z]:\\Users\\[^\s\\]+/gi, replacement: '[REDACTED_PATH]' },
  { pattern: /\/home\/[^\s/]+/g, replacement: '[REDACTED_PATH]' },
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
