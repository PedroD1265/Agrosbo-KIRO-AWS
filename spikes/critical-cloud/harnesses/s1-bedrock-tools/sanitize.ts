/**
 * S1 Harness -- Log Sanitization
 *
 * Ensures no sensitive content (prompts, secrets, real data) appears in logs.
 * DISPOSABLE -- not production code.
 */

// Patterns that should be redacted from logs
const SENSITIVE_PATTERNS: Array<{ pattern: RegExp; replacement: string }> = [
  // AWS credentials
  { pattern: /AKIA[0-9A-Z]{16}/g, replacement: '[REDACTED_AWS_KEY]' },
  {
    pattern: /(?:aws_secret_access_key|AWS_SECRET_ACCESS_KEY)\s*[=:]\s*\S+/gi,
    replacement: '[REDACTED_SECRET]',
  },
  {
    pattern: /(?:aws_session_token|AWS_SESSION_TOKEN)\s*[=:]\s*\S+/gi,
    replacement: '[REDACTED_TOKEN]',
  },

  // Generic secrets
  {
    pattern: /(?:password|secret|token|api[_-]?key)\s*[=:]\s*["']?[^\s"']+["']?/gi,
    replacement: '[REDACTED_CREDENTIAL]',
  },

  // Email addresses (basic)
  { pattern: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, replacement: '[REDACTED_EMAIL]' },

  // Phone numbers (basic)
  {
    pattern: /\+?\d{1,4}[-.\s]?\(?\d{1,3}\)?[-.\s]?\d{1,4}[-.\s]?\d{1,9}/g,
    replacement: '[REDACTED_PHONE]',
  },
];

// Maximum length for logged content blocks
const MAX_CONTENT_LOG_LENGTH = 200;

/**
 * Sanitizes a string for safe logging.
 */
export function sanitize(input: string): string {
  let result = input;
  for (const { pattern, replacement } of SENSITIVE_PATTERNS) {
    // Reset regex state for global patterns
    pattern.lastIndex = 0;
    result = result.replace(pattern, replacement);
  }
  return result;
}

/**
 * Truncates content for logging, indicating truncation.
 */
export function truncateForLog(
  content: string,
  maxLength: number = MAX_CONTENT_LOG_LENGTH,
): string {
  if (content.length <= maxLength) {
    return content;
  }
  return content.substring(0, maxLength) + `... [truncated, ${content.length} chars total]`;
}

/**
 * Creates a safe log entry for a tool call.
 */
export function safeToolCallLog(
  toolName: string,
  args: Record<string, unknown>,
  result: string,
): string {
  const safeArgs = sanitize(JSON.stringify(args));
  const safeResult = truncateForLog(sanitize(result));
  return `[tool:${toolName}] args=${safeArgs} result=${safeResult}`;
}

/**
 * Creates a safe log entry for a conversation message.
 * Never logs full prompt content.
 */
export function safeMessageLog(role: string, contentLength: number, blockCount: number): string {
  return `[msg:${role}] blocks=${blockCount} chars=${contentLength}`;
}

/**
 * Checks if a string contains potentially sensitive content.
 * Used by tests to verify sanitization.
 */
export function containsSensitive(input: string): boolean {
  for (const { pattern } of SENSITIVE_PATTERNS) {
    pattern.lastIndex = 0;
    if (pattern.test(input)) {
      return true;
    }
  }
  return false;
}
