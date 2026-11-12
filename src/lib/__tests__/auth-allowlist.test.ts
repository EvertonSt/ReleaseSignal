import { describe, expect, it } from "vitest";
import { isAllowedGitHubIdentity } from "../auth-allowlist";

function env(values: Record<string, string>): NodeJS.ProcessEnv {
  return values as NodeJS.ProcessEnv;
}

describe("isAllowedGitHubIdentity", () => {
  it("fails closed when no allowlist is configured", () => {
    expect(isAllowedGitHubIdentity({ login: "EvertonSt" }, env({}))).toBe(false);
  });

  it("allows a configured login regardless of case or surrounding spaces", () => {
    expect(
      isAllowedGitHubIdentity(
        { login: "evertonst" },
        env({ AUTH_ALLOWED_GITHUB_LOGINS: "  EvertonSt, someone-else  " })
      )
    ).toBe(true);
  });

  it("rejects a login that is not on the list", () => {
    expect(
      isAllowedGitHubIdentity({ login: "attacker" }, env({ AUTH_ALLOWED_GITHUB_LOGINS: "EvertonSt" }))
    ).toBe(false);
  });

  it("rejects a missing or malformed profile", () => {
    const allowlist = env({ AUTH_ALLOWED_GITHUB_LOGINS: "EvertonSt" });
    expect(isAllowedGitHubIdentity(undefined, allowlist)).toBe(false);
    expect(isAllowedGitHubIdentity({}, allowlist)).toBe(false);
    expect(isAllowedGitHubIdentity({ login: 123 }, allowlist)).toBe(false);
  });

  it("allows a configured public email as an optional second path", () => {
    expect(
      isAllowedGitHubIdentity(
        { login: "private-login", email: "Owner@Example.com" },
        env({ AUTH_ALLOWED_GITHUB_EMAILS: "owner@example.com" })
      )
    ).toBe(true);
  });
});
