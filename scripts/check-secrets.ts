#!/usr/bin/env node
/**
 * Fails if the repository contains anything that looks like a live credential.
 *
 * Two different jobs, deliberately kept apart:
 *
 *  - `scan()` catches a credential that was committed. It reads the tracked
 *    tree, so an untracked `.env.local` on a developer's machine is not a
 *    failure - that file is supposed to exist locally and is gitignored.
 *  - `containsSecrets()` answers "would this text be safe to log?". That is
 *    the runtime question, and it is the one the unit tests cover.
 *
 * The patterns here are deliberately anchored to real provider formats rather
 * than the word "password", which would fire on a fixture, a test title, and
 * a documentation example alike. A scanner that cries wolf gets switched off,
 * and a scanner that is switched off protects nothing.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, extname } from "node:path";
import { execFileSync } from "node:child_process";

const ROOT = process.cwd();

/** Directories that never contain authored source. */
const SKIP_DIRECTORIES = new Set([
  ".git",
  ".next",
  "node_modules",
  "coverage",
  "playwright-report",
  "test-results",
  "public",
]);

const TEXT_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".mjs",
  ".cjs",
  ".json",
  ".yml",
  ".yaml",
  ".md",
  ".mdx",
  ".css",
  ".prisma",
  ".sh",
  ".txt",
  ".example",
]);

interface Finding {
  file: string;
  line: number;
  rule: string;
  detail: string;
}

interface Rule {
  name: string;
  pattern: RegExp;
  /** A placeholder that is obviously not a credential. */
  allow?: RegExp;
  why: string;
}

const RULES: Rule[] = [
  {
    name: "github-token",
    pattern: /\bgh[pousr]_[A-Za-z0-9]{36,}\b/g,
    why: "GitHub personal/OAuth/App/refresh token",
  },
  {
    name: "github-fine-grained-pat",
    pattern: /\bgithub_pat_[A-Za-z0-9_]{60,}\b/g,
    why: "GitHub fine-grained personal access token",
  },
  {
    name: "anthropic-key",
    pattern: /\bsk-ant-[A-Za-z0-9_-]{40,}\b/g,
    why: "Anthropic API key",
  },
  {
    name: "openai-key",
    pattern: /\bsk-(?!ant-)[A-Za-z0-9]{40,}\b/g,
    why: "OpenAI API key",
  },
  {
    name: "aws-access-key",
    pattern: /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/g,
    why: "AWS access key id",
  },
  {
    name: "slack-token",
    pattern: /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/g,
    why: "Slack token",
  },
  {
    name: "google-api-key",
    pattern: /\bAIza[0-9A-Za-z_-]{35}\b/g,
    why: "Google API key",
  },
  {
    name: "private-key-block",
    pattern: /-----BEGIN (?:RSA |EC |OPENSSH |PGP )?PRIVATE KEY-----/g,
    why: "PEM private key",
  },
  {
    name: "connection-string-with-password",
    pattern: /\b(?:postgres(?:ql)?|mysql|mongodb(?:\+srv)?|redis):\/\/[^:\s@/]+:[^@\s/]+@/g,
    why: "Database URL containing an inline password",
  },
];

/**
 * Values that are structurally correct but deliberately fake. Every one of these
 * appears in documentation or in a test on purpose, and the scanner has to be
 * able to tell the difference - otherwise the first person to add a realistic
 * example deletes the scanner.
 */
const PLACEHOLDER_WORDS =
  /^(?:x{4,}|\*{4,}|\.{3,}|<[^>]+>|\$\{[^}]+\}|\{\{[^}]+\}\}|REDACTED|CHANGEME|your[-_ ]?\w+|example|sample|dummy|fake|test|placeholder|abc123|12345|00000|change[-_]?me|dev|local|localhost)/i;

/**
 * Test files are exempt, and the exemption is printed on every run.
 *
 * `src/lib/security/__tests__/secrets.test.ts` cannot assert that a redaction
 * rule fires without containing a value shaped like a credential. Requiring
 * those files to use obviously-fake values is what makes the gate trustworthy
 * everywhere else, so they are skipped by exact path - not by pattern on the
 * *content*, which is the thing that matters.
 */
const EXEMPT_PATHS = [/(^|\/)__tests__\//, /\.test\.(ts|tsx|js|mjs)$/];

function isExempt(file: string): boolean {
  return EXEMPT_PATHS.some((pattern) => pattern.test(file.replace(/\\/g, "/")));
}

/**
 * A template password says so. A real one containing the literal word
 * "password" is conceivable but vanishingly unlikely, and this check is only
 * ever applied to the password component of a connection URL - never to a
 * token, where the same substring could be part of the secret.
 */
const TEMPLATE_PASSWORD =
  /(?:password|passwd|secret|changeme|change[_-]?me|your|example|dummy|placeholder|local|dev|test)/i;

/**
 * A credential is one long run with no internal structure. Real ones are
 * mixed-case and mixed-character; samples are padded with a single repeated
 * character or with a straight alphabetical or numeric run.
 */
function isObviouslySynthetic(value: string): boolean {
  const trimmed = value.trim();
  if (PLACEHOLDER_WORDS.test(trimmed)) return true;

  // A value can be judged with or without its provider prefix, but never by
  // stripping that prefix blind: `ghp_abcdef` and `releasesignal_dev_password`
  // both start with letters followed by an underscore.
  const candidates = [trimmed, trimmed.replace(/^[a-z]{2,6}(?:[-_](?:key|token|pat))?[-_]/i, "")];

  return candidates.some((body) => {
    if (body.length < 4) return false;
    if (/^(.)\1{3,}$/.test(body)) return true; // xxxxxxxx, AAAAAAAA
    return /^[A-Za-z0-9]{6,}$/.test(body) && isSequential(body);
  });
}

/** True when every adjacent pair steps by exactly one in the same direction. */
function isSequential(text: string): boolean {
  if (text.length < 6) return false;
  const step = text.charCodeAt(1) - text.charCodeAt(0);
  if (step !== 1 && step !== -1) return false;
  for (let i = 2; i < text.length; i++) {
    if (text.charCodeAt(i) - text.charCodeAt(i - 1) !== step) return false;
  }
  return true;
}

/**
 * The part of a match that carries the secret.
 *
 * For a connection URL the whole string is not the secret - the password is.
 * Judging the whole thing means a template with a literal `password` in it gets
 * reported as a leak, which trains people to ignore this gate.
 */
function secretPartOf(value: string): string {
  if (value.includes("://")) {
    const credentials = value.slice(value.indexOf("://") + 3).split("@")[0] ?? "";
    const [, password] = credentials.split(":");
    return password ?? credentials;
  }
  return value;
}

/**
 * Every file that is tracked, plus every untracked file that is not ignored.
 *
 * The untracked half matters: before the first commit `git ls-files` returns
 * nothing at all, and a gate that scans zero files reports a confident pass.
 * `--exclude-standard` keeps a local `.env.local` out of the scan while still
 * covering work that has not been staged yet.
 */
function candidateFiles(): string[] {
  try {
    const output = execFileSync("git", ["ls-files", "-z", "--cached", "--others", "--exclude-standard"], {
      cwd: ROOT,
      encoding: "utf8",
      maxBuffer: 64 * 1024 * 1024,
    });
    const files = output.split("\0").filter(Boolean);
    if (files.length > 0) return files;
  } catch {
    // Not a repository, or git unavailable. Fall through to the filesystem so
    // the gate still runs instead of silently passing.
  }
  return walk(ROOT);
}

function walk(dir: string): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRECTORIES.has(entry)) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) found.push(...walk(full));
    else found.push(full);
  }
  return found;
}

export function scan(files: string[]): Finding[] {
  const findings: Finding[] = [];

  for (const file of files) {
    const extension = extname(file);
    if (!TEXT_EXTENSIONS.has(extension) && extension !== "") continue;
    if (isExempt(file)) continue;

    let contents: string;
    try {
      contents = readFileSync(join(ROOT, file), "utf8");
    } catch {
      continue;
    }

    const lines = contents.split("\n");
    lines.forEach((line, index) => {
      for (const rule of RULES) {
        rule.pattern.lastIndex = 0;
        for (const match of line.matchAll(rule.pattern)) {
          const value = match[0];
          if (isObviouslySynthetic(value)) continue;

          const secret = secretPartOf(value);
          if (rule.name === "connection-string-with-password") {
            if (TEMPLATE_PASSWORD.test(secret)) continue;
          }
          if (isObviouslySynthetic(secret)) continue;
          if (rule.allow?.test(value)) continue;

          findings.push({
            file,
            line: index + 1,
            rule: rule.name,
            detail: `${rule.why}: ${value.slice(0, 12)}…`,
          });
        }
      }
    });
  }

  return findings;
}

function main(): void {
  const files = candidateFiles();
  const findings = scan(files);
  const scanned = files.filter((file) => !isExempt(file));

  if (findings.length === 0) {
    console.log(`✓ No credentials in ${scanned.length} scanned files.`);
    console.log(`  (${files.length - scanned.length} test files exempt - see EXEMPT_PATHS)`);
    return;
  }

  console.error(`✗ ${findings.length} potential credential(s) found:\n`);
  for (const finding of findings) {
    console.error(`  ${finding.file}:${finding.line}  [${finding.rule}]  ${finding.detail}`);
  }
  console.error(
    "\nIf one of these is a deliberate example, make it obviously fake\n" +
      "(CHANGEME, your-token-here) rather than weakening the rule."
  );
  process.exitCode = 1;
}

// Only run when invoked directly, so the rule list can be imported by a test.
if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, "/").split("/").pop() ?? "")) {
  main();
}
