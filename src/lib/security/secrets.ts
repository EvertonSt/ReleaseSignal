// ── Secret Redaction ───────────────────────────────────────────────────────
// Redacts sensitive data from strings before logging or sending to AI.

const SECRET_PATTERNS: RegExp[] = [
  /ghp_[A-Za-z0-9]{36}/g, // GitHub personal access tokens
  /gho_[A-Za-z0-9]{36}/g, // GitHub OAuth tokens
  /ghu_[A-Za-z0-9]{36}/g, // GitHub user-to-server tokens
  /ghs_[A-Za-z0-9]{36}/g, // GitHub server-to-server tokens
  /ghr_[A-Za-z0-9]{36}/g, // GitHub refresh tokens
  /sk-[A-Za-z0-9]{48}/g, // OpenAI API keys
  /sk-ant-[A-Za-z0-9]{48}/g, // Anthropic API keys
  /xox[bpsa]-[A-Za-z0-9-]+/g, // Slack tokens
  /AKIA[0-9A-Z]{16}/g, // AWS access keys
  /-----BEGIN [A-Z ]+ PRIVATE KEY-----[\s\S]*?-----END [A-Z ]+ PRIVATE KEY-----/g, // Private keys
  /mongodb(\+srv)?:\/\/[^\s]+/g, // MongoDB connection strings
  /postgresql:\/\/[^\s]+/g, // PostgreSQL connection strings
  /redis:\/\/[^\s]+/g, // Redis connection strings
  /password["\s:=]+["']?[^\s"']+/gi, // Password values
  /secret["\s:=]+["']?[^\s"']+/gi, // Secret values
  /token["\s:=]+["']?[^\s"']+/gi, // Token values
  /\b(?:api[-_]?key|access[-_]?key|auth[-_]?key)["\s:=]+["']?[^\s"']+/gi, // Keyed credentials
];

/** Redact sensitive data from a string */
export function redactSecrets(text: string): string {
  let redacted = text;
  for (const pattern of SECRET_PATTERNS) {
    redacted = redacted.replace(pattern, "[REDACTED]");
  }
  return redacted;
}

/**
 * Check if a string contains potential secrets.
 *
 * `RegExp.prototype.test` advances `lastIndex` on a global regex and leaves it
 * there. Reusing these module-level patterns meant the second call on the same
 * string could start scanning past the match it had just found and answer
 * "no secrets here". A leak detector that intermittently says no is worse than
 * one that does not exist, so each check runs against a fresh non-global copy.
 */
export function containsSecrets(text: string): boolean {
  return SECRET_PATTERNS.some((pattern) =>
    new RegExp(pattern.source, pattern.flags.replace("g", "")).test(text)
  );
}

/** Sanitize a string for safe logging */
export function sanitizeForLog(text: string): string {
  const redacted = redactSecrets(text);
  // Also truncate very long strings
  if (redacted.length > 1000) {
    return redacted.slice(0, 1000) + "...[truncated]";
  }
  return redacted;
}
