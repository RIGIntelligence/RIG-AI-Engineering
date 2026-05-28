const SECRET_PATTERNS: Array<[RegExp, string]> = [
  [/\bgh[pousr]_[A-Za-z0-9_]{20,}\b/g, "[REDACTED_GITHUB_TOKEN]"],
  [/\bsk-[A-Za-z0-9_-]{20,}\b/g, "[REDACTED_API_KEY]"],
  [/\b(xox[baprs]-[A-Za-z0-9-]{20,})\b/g, "[REDACTED_SLACK_TOKEN]"],
  [/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, "[REDACTED_EMAIL]"],
  [/\bBearer\s+[A-Za-z0-9._~+/=-]{16,}\b/gi, "Bearer [REDACTED_TOKEN]"],
  [/\b[A-Fa-f0-9]{32,}\b/g, "[REDACTED_HEX_SECRET]"],
];

export function redactSecrets(input: string): string {
  const withAssignmentsRedacted = input.replace(
    /\b(password|passwd|pwd|secret|token|api[_-]?key|cookie)\s*[:=]\s*["']?[^"'\s]{6,}/gi,
    (_match, key: string) => `${key}=[REDACTED_SECRET]`,
  );
  return SECRET_PATTERNS.reduce(
    (value, [pattern, replacement]) => value.replace(pattern, replacement),
    withAssignmentsRedacted,
  );
}

export function hasCredentialShape(input: string): boolean {
  return redactSecrets(input) !== input;
}
