import { describe, it, expect, afterEach } from "vitest";
import { isGitHubConfigured, getIntegrationStatus } from "../client";

/*
 * These functions read process.env directly, so each test sets exactly the
 * variables it cares about and the suite restores them afterwards. Without the
 * restore, a test that sets GITHUB_APP_ID leaks into the next one and the
 * "not configured" cases start passing for the wrong reason - or stop passing
 * at all, depending on which runs first.
 */
const KEYS = ["GITHUB_APP_ID", "GITHUB_PRIVATE_KEY", "GITHUB_WEBHOOK_SECRET"] as const;
const saved = new Map<string, string | undefined>();

beforeEach(() => {
  for (const key of KEYS) saved.set(key, process.env[key]);
});

afterEach(() => {
  for (const key of KEYS) {
    const value = saved.get(key);
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

function configure(overrides: Partial<Record<(typeof KEYS)[number], string>> = {}) {
  for (const key of KEYS) delete process.env[key];
  for (const [key, value] of Object.entries(overrides)) process.env[key] = value;
}

describe("isGitHubConfigured", () => {
  it("requires all three credentials, not just one", () => {
    configure({ GITHUB_APP_ID: "123" });
    expect(isGitHubConfigured()).toBe(false);

    configure({ GITHUB_APP_ID: "123", GITHUB_PRIVATE_KEY: "-----BEGIN RSA-----" });
    expect(isGitHubConfigured()).toBe(false);
  });

  it("is configured once all three are present", () => {
    configure({
      GITHUB_APP_ID: "123",
      GITHUB_PRIVATE_KEY: "-----BEGIN RSA-----",
      GITHUB_WEBHOOK_SECRET: "whsec_abc",
    });
    expect(isGitHubConfigured()).toBe(true);
  });

  it("treats an empty string as missing", () => {
    // An empty env var is a common way to "unset" a value in a .env file, and
    // `Boolean("")` being true would silently enable a broken integration.
    configure({
      GITHUB_APP_ID: "123",
      GITHUB_PRIVATE_KEY: "",
      GITHUB_WEBHOOK_SECRET: "whsec_abc",
    });
    expect(isGitHubConfigured()).toBe(false);
  });
});

describe("getIntegrationStatus", () => {
  it("reports the integration as planned when unconfigured", () => {
    configure();
    const status = getIntegrationStatus();
    expect(status.configured).toBe(false);
    expect(status.message).toMatch(/planned/i);
  });

  it("reports the integration as active when configured", () => {
    configure({
      GITHUB_APP_ID: "123",
      GITHUB_PRIVATE_KEY: "-----BEGIN RSA-----",
      GITHUB_WEBHOOK_SECRET: "whsec_abc",
    });
    const status = getIntegrationStatus();
    expect(status.configured).toBe(true);
    expect(status.message).toMatch(/active/i);
  });

  it("never echoes a credential in its message", () => {
    configure({
      GITHUB_APP_ID: "123",
      GITHUB_PRIVATE_KEY: "super-secret-key-material",
      GITHUB_WEBHOOK_SECRET: "whsec_abc",
    });
    expect(getIntegrationStatus().message).not.toContain("super-secret-key-material");
  });
});
