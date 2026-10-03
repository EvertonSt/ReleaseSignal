import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

/**
 * Zero AI attribution, enforced over the repository and its whole history.
 *
 * Three surfaces, because each one fails differently:
 *
 *  1. Working tree - tracked text files, read for attribution shapes.
 *  2. History - every commit reachable from any ref, read for trailers. A
 *     commit that was removed from a branch is still fetchable from GitHub by
 *     its SHA, so walking `main` is necessary and not sufficient.
 *  3. Authorship - every commit must be authored and committed by the owner.
 *     GitHub builds the contributor list from exactly these two fields plus any
 *     co-author trailer, which is how a second contributor appears on a repo
 *     that only one person ever wrote to.
 *
 * The patterns describe the SHAPE of an attribution claim rather than a list of
 * tool names. A denylist is a list that is always out of date, and it fails
 * silently the first time a tool nobody listed produces a commit - which is
 * exactly what happened in the repository this one replaces.
 */

const OWNER_NAME = "Everton S. Andrade";
const OWNER_EMAIL = "46034541+EvertonSt@users.noreply.github.com";

const findings: string[] = [];

const git = (args: string[]): string => {
  try {
    return execFileSync("git", args, {
      cwd: ROOT,
      encoding: "utf8",
      maxBuffer: 64 * 1024 * 1024,
    });
  } catch (error) {
    // A failing git command is a finding, not a reason to report success.
    const message = error instanceof Error ? error.message.split("\n")[0] : String(error);
    findings.push(`git ${args.join(" ")} failed: ${message}`);
    return "";
  }
};

/**
 * Attribution shapes. Each is a pattern over the whole message, matched per
 * line where that makes the intent clearer.
 *
 * `trailer` marks the shapes that assert authorship. They are relaxed for
 * commits GitHub's own automation made - see AUTOMATION_IDENTITIES - because a
 * DCO signature from a dependency bot is a bot signing its own commit, not a
 * person claiming co-authorship.
 */
const SHAPES: { name: string; pattern: RegExp; trailer?: boolean }[] = [
  { name: "co-author trailer", pattern: /^\s*co-?authored-by\s*:/im, trailer: true },
  {
    name: "authorship-style trailer",
    pattern:
      /^\s*(generated-by|generated-with|created-by|authored-by|written-by|produced-by|assisted-by|helper|agent)\s*:/im,
    trailer: true,
  },
  { name: "signed-off-by trailer", pattern: /^\s*signed-off-by\s*:/im, trailer: true },
  {
    name: "tool credit phrasing",
    pattern:
      /^\s*[^a-z]*(generated|created|written|authored|co-?written|produced|powered|assisted|helped)\s+(with|by)\s+(an?\s+)?(ai|llm|agent|assistant|bot|model|tool|codex|chatgpt|claude|copilot|gemini|cursor|codebuff|freebuff)\b/im,
  },
  {
    name: "describes the work as generated",
    pattern:
      /\b(ai-?assisted|ai-?generated|ai-?written|vibe-?cod(ed|ing)|machine-?written|agent-?written|written by (an?\s+)?(coding\s+)?(ai|llm|agent|assistant|bot|model))\b/i,
  },
  { name: "robot emoji", pattern: /[\u{1F916}\u{1F47B}\u{1F9D9}]/u },
  { name: "this project's agent tooling", pattern: /\b(codebuff|freebuff)\b/i },
];

/**
 * GitHub's own automation, by identity.
 *
 * CI checks out every ref, which includes the branches the dependency bot
 * pushes. Those commits are authored by `dependabot[bot]` and committed by
 * `GitHub`, and they carry a DCO `Signed-off-by` trailer. Without this list the
 * audit fails on every run, for commits the owner did not write and cannot
 * attribute - and a permanently red gate is a gate nobody reads.
 *
 * The exemption is deliberately narrow and deliberately visible: only these
 * exact identities, only the authorship trailers, and the count is printed at
 * the end. Any other author - a colleague, another tool, an account that merely
 * looks like a bot - is still a finding.
 */
const AUTOMATION_IDENTITIES = new Set([
  "dependabot[bot] <49699333+dependabot[bot]@users.noreply.github.com>",
  "github-actions[bot] <41898282+github-actions[bot]@users.noreply.github.com>",
  "GitHub <noreply@github.com>",
]);

function describe(text: string, where: string, allowTrailers = false) {
  for (const shape of SHAPES) {
    if (shape.trailer && allowTrailers) continue;
    const match = shape.pattern.exec(text);
    if (match) {
      const line = text.slice(0, match.index).split("\n").length;
      findings.push(`${where}: ${shape.name} at line ${line} -> ${match[0].trim().slice(0, 90)}`);
    }
  }
}

/**
 * The files that necessarily contain the patterns they forbid: the checker
 * itself, the shell guard that enforces the same rules before a commit exists,
 * and the kit's own test for this guard. A guard that could not name what it
 * forbids could not forbid it, so exempting them is not a hole - it is the only
 * way the rule can be written down at all.
 */
const SELF_EXEMPT = new Set(["scripts/check-attribution.ts", ".husky/commit-msg"]);

// ------------------------------------------------- 1. working tree --------

const SKIP_DIRECTORIES = new Set([
  "node_modules",
  ".git",
  ".next",
  "dist",
  "coverage",
  "test-results",
  "playwright-report",
  "public",
]);
const BINARY = /\.(png|jpg|jpeg|gif|webp|ico|pdf|woff2?|zip|gz)$/i;

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    if (SKIP_DIRECTORIES.has(entry)) return [];
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) return walk(full);
    return BINARY.test(entry) ? [] : [full];
  });
}

const files = walk(ROOT);
for (const file of files) {
  const relative = path.relative(ROOT, file).replace(/\\/g, "/");
  let text: string;
  try {
    text = readFileSync(file, "utf8");
  } catch {
    continue;
  }
  // Skip the guards themselves: finding the patterns inside the rule that bans
  // them is the definition of a false positive.
  if (SELF_EXEMPT.has(relative)) continue;

  describe(text, relative);
}

// --------------------------------------------------- 2. history -----------

const SHAs = git(["rev-list", "--all"]).split("\n").filter(Boolean);
if (SHAs.length === 0) {
  findings.push("no commits found; cannot audit history");
}

const seen = new Set<string>();
let automated = 0;
for (const sha of SHAs) {
  const message = git(["log", "-1", "--format=%B", sha]);
  if (!message) continue;

  const author = git(["log", "-1", "--format=%an <%ae>", sha]).trim();
  const committer = git(["log", "-1", "--format=%cn <%ce>", sha]).trim();
  const isAutomation = AUTOMATION_IDENTITIES.has(author) || AUTOMATION_IDENTITIES.has(committer);
  if (isAutomation) automated += 1;

  for (const shape of SHAPES) {
    // A bot signing its own commit is not a person claiming co-authorship; a
    // bot taking credit for the work still is, so only the trailers relax.
    if (shape.trailer && isAutomation) continue;
    const match = shape.pattern.exec(message);
    if (match) {
      const key = `${sha}:${match[0]}`;
      if (!seen.has(key)) {
        seen.add(key);
        findings.push(`commit ${sha.slice(0, 7)}: ${shape.name} -> ${match[0].trim().slice(0, 90)}`);
      }
    }
  }
}

// ------------------------------------------- 3. authorship identity -------

const identity = git(["log", "--all", "--format=%an <%ae>|%cn <%ce>"]).split("\n").filter(Boolean);

const EXPECTED_IDENTITY = `${OWNER_NAME} <${OWNER_EMAIL}>`;

for (const line of identity) {
  const [author, committer] = line.split("|");
  // GitHub's automation is exempt for the same reason its trailers are: the
  // owner did not write these and cannot attribute them. Everything else has to
  // be the owner, on every ref, not just on main.
  if (AUTOMATION_IDENTITIES.has(author ?? "") || AUTOMATION_IDENTITIES.has(committer ?? "")) {
    continue;
  }
  if (author !== EXPECTED_IDENTITY) {
    findings.push(`commit authored by "${author}", expected ${EXPECTED_IDENTITY}`);
  }
  if (committer !== EXPECTED_IDENTITY) {
    findings.push(`commit committed by "${committer}", expected ${EXPECTED_IDENTITY}`);
  }
}

// ------------------------------------------------------- verdict -----------

if (findings.length > 0) {
  console.error(`ATTRIBUTION AUDIT FAILED - ${findings.length} finding(s)`);
  for (const finding of findings.slice(0, 40)) console.error(`  - ${finding}`);
  if (findings.length > 40) console.error(`  ... and ${findings.length - 40} more`);
  console.error("");
  console.error("  The owner is the sole author of every commit. Remove the trailer or stamp,");
  console.error("  amend locally, and rewrite the message rather than bypassing the hook.");
  process.exit(1);
}

console.log(
  [
    `ATTRIBUTION CLEAN - ${files.length} file(s) and ${SHAs.length} commit(s) audited; authorship is ${OWNER_NAME} only`,
    automated > 0
      ? `  ${automated} commit(s) by GitHub automation were exempt from the authorship rule: they are the dependency bot's own branches, not the owner's history.`
      : "",
  ]
    .filter(Boolean)
    .join("\n")
);
