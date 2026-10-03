import { describe, it, expect } from "vitest";
import { redactSecrets, containsSecrets, sanitizeForLog } from "../secrets";

/*
 * The redaction list is the last thing between a leaked credential and a log
 * aggregator, so each pattern is exercised with a value shaped exactly like
 * the one the provider issues.
 */
describe("redactSecrets", () => {
  it("redacts GitHub personal access tokens", () => {
    const result = redactSecrets("Token: ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghij");
    expect(result).not.toContain("ghp_");
    expect(result).toContain("[REDACTED]");
  });

  it("redacts GitHub OAuth tokens", () => {
    expect(redactSecrets("Token: gho_ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghij")).not.toContain("gho_");
  });

  it("redacts GitHub app and refresh tokens", () => {
    expect(redactSecrets("ghs_ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghij")).toBe("[REDACTED]");
    expect(redactSecrets("ghr_ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghij")).toBe("[REDACTED]");
  });

  it("redacts OpenAI API keys (48 chars after sk-)", () => {
    const result = redactSecrets("key=sk-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA");
    expect(result).not.toContain("sk-");
    expect(result).toContain("[REDACTED]");
  });

  it("redacts Anthropic API keys", () => {
    const result = redactSecrets("key=sk-ant-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA");
    expect(result).not.toContain("sk-ant-");
  });

  it("redacts Slack tokens", () => {
    expect(redactSecrets("xoxb-1234567890-abcdefghijkl")).not.toContain("xoxb-");
  });

  it("redacts AWS access keys", () => {
    expect(redactSecrets("AWS key: AKIAIOSFODNN7EXAMPLE")).not.toContain("AKIAIOSFODNN");
  });

  it("redacts PEM private keys including the body", () => {
    const pem = "-----BEGIN RSA PRIVATE KEY-----\nMIIEow\nIBAAKC\n-----END RSA PRIVATE KEY-----";
    const result = redactSecrets(pem);
    expect(result).not.toContain("MIIEow");
    expect(result).toBe("[REDACTED]");
  });

  it("redacts database connection strings with their credentials", () => {
    expect(redactSecrets("DB=mongodb+srv://user:pass@cluster.example.com/db")).not.toContain("pass@cluster");
    expect(redactSecrets("DATABASE_URL=postgresql://admin:hunter2@db:5432/app")).not.toContain("hunter2");
    expect(redactSecrets("REDIS_URL=redis://:secretpw@cache:6379")).not.toContain("secretpw");
  });

  it("redacts password, secret and token assignments", () => {
    expect(redactSecrets("password=supersecret123")).not.toContain("supersecret123");
    expect(redactSecrets("secret: topsecret")).not.toContain("topsecret");
    expect(redactSecrets("token: abc123def456ghi789")).toContain("[REDACTED]");
  });

  it("redacts keyed credentials, which the original list missed", () => {
    // `apiKey` matched none of the password/secret/token patterns, so an
    // integration payload logging its own config would have printed the key.
    expect(redactSecrets('{"apiKey": "abc123"}')).not.toContain("abc123");
    expect(redactSecrets("access_key=AKIAIOSFODNN7EXAMPLE")).not.toContain("AKIAIOSFODNN7EXAMPLE");
    expect(redactSecrets("AUTH_KEY: hunter2")).not.toContain("hunter2");
  });

  it("preserves non-secret content", () => {
    const input = "Test run completed successfully with 42 tests";
    expect(redactSecrets(input)).toBe(input);
  });

  it("handles an empty string", () => {
    expect(redactSecrets("")).toBe("");
  });

  it("redacts every secret in a string that carries several", () => {
    const result = redactSecrets(
      "ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghij and gho_ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghij"
    );
    expect(result.match(/\[REDACTED\]/g)).toHaveLength(2);
  });
});

describe("containsSecrets", () => {
  it("detects GitHub tokens", () => {
    expect(containsSecrets("ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghij")).toBe(true);
  });

  it("detects password patterns", () => {
    expect(containsSecrets("password=mysecret")).toBe(true);
  });

  it("returns false for clean text", () => {
    expect(containsSecrets("No secrets here")).toBe(false);
  });

  it("gives the same answer every time it is asked about the same string", () => {
    // Regression guard. `test` on a /g regex advances `lastIndex` and leaves
    // it set, so the previous implementation answered true and then false for
    // identical input. A scanner that sometimes clears a payload is worse than
    // no scanner, because the caller stops trusting it.
    const leaky = "ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghij";
    expect(containsSecrets(leaky)).toBe(true);
    expect(containsSecrets(leaky)).toBe(true);
    expect(containsSecrets(leaky)).toBe(true);
  });

  it("keeps alternating calls independent of one another", () => {
    const clean = "nothing sensitive here";
    const leaky = "gho_ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghij";

    expect(containsSecrets(clean)).toBe(false);
    expect(containsSecrets(leaky)).toBe(true);
    expect(containsSecrets(clean)).toBe(false);
  });
});

describe("sanitizeForLog", () => {
  it("redacts before returning", () => {
    const result = sanitizeForLog("password=hunter2 at login");
    expect(result).not.toContain("hunter2");
    expect(result).toContain("[REDACTED]");
  });

  it("truncates a long payload and says so", () => {
    const result = sanitizeForLog("x".repeat(5000));
    expect(result).toHaveLength(1000 + "...[truncated]".length);
    expect(result.endsWith("...[truncated]")).toBe(true);
  });

  it("leaves a payload at the limit untouched", () => {
    const exact = "y".repeat(1000);
    expect(sanitizeForLog(exact)).toBe(exact);
  });

  it("never emits more than a bounded number of characters", () => {
    const withSecret = `ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghij ${"z".repeat(5000)}`;
    expect(sanitizeForLog(withSecret).length).toBeLessThanOrEqual(1016);
    expect(sanitizeForLog(withSecret)).not.toContain("ghp_");
  });
});
