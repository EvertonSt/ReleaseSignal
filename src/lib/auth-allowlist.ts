/**
 * Only the owner's GitHub identity may create a session in production.
 *
 * The allowlist is environment-driven and FAILS CLOSED: if neither list is
 * configured, no OAuth identity is accepted. GitHub often hides the primary
 * email, so the login allowlist is the reliable production control; the email
 * list is an optional additional path for accounts whose email is public.
 */
function names(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

export function isAllowedGitHubIdentity(profile: unknown, env: NodeJS.ProcessEnv = process.env): boolean {
  const allowedLogins = names(env.AUTH_ALLOWED_GITHUB_LOGINS);
  const allowedEmails = names(env.AUTH_ALLOWED_GITHUB_EMAILS);

  // No allowlist means no access, not "allow everyone".
  if (allowedLogins.length === 0 && allowedEmails.length === 0) return false;

  const candidate = profile as { login?: unknown; email?: unknown } | null | undefined;
  const login = typeof candidate?.login === "string" ? candidate.login.trim().toLowerCase() : "";
  const email = typeof candidate?.email === "string" ? candidate.email.trim().toLowerCase() : "";

  return (
    (login.length > 0 && allowedLogins.includes(login)) || (email.length > 0 && allowedEmails.includes(email))
  );
}
