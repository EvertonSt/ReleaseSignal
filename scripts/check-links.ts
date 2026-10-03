import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import path from "node:path";

/**
 * Internal link and file-reference check.
 *
 * Two things a recruiter clicking around the repository will notice first:
 * a README link to a file that was renamed, and an in-app link to a route that
 * does not exist. Neither shows up in a build - a broken `<a href>` compiles
 * perfectly - and both make the rest of the work look careless.
 *
 * External URLs are listed but never fetched. A link checker that blocks on
 * someone's rate-limited API is a gate people disable.
 */

const ROOT = process.cwd();

const SKIP_DIRECTORIES = new Set([
  "node_modules",
  ".git",
  ".next",
  "coverage",
  "test-results",
  "playwright-report",
  "public",
]);
const BINARY = /\.(png|jpg|jpeg|gif|webp|ico|pdf|woff2?|zip|gz)$/i;
const TEXT = /\.(ts|tsx|js|mjs|cjs|json|md|mdx|css|yml|yaml|sh|prisma)$/i;

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    if (SKIP_DIRECTORIES.has(entry)) return [];
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) return walk(full);
    return BINARY.test(entry) ? [] : [full];
  });
}

/** Every route the app actually serves. */
function appRoutes(): Set<string> {
  const appDir = path.join(ROOT, "src", "app");
  const routes = new Set<string>();
  if (!existsSync(appDir)) return routes;

  const visit = (dir: string, prefix: string) => {
    for (const entry of readdirSync(dir)) {
      const full = path.join(dir, entry);
      if (statSync(full).isDirectory()) {
        // Route groups like `(app)` organise files without adding a segment.
        const isGroup = entry.startsWith("(") && entry.endsWith(")");
        visit(full, isGroup ? prefix : `${prefix}/${entry}`);
        continue;
      }
      if (entry === "page.tsx" || entry === "route.ts") routes.add(prefix || "/");
      // A dynamic segment is a real route with an unknown value; register the
      // prefix so `/test-runs/run_001` is not reported as broken.
      if (entry === "[...nextauth]") routes.add(prefix);
    }
  };

  visit(appDir, "");
  return routes;
}

interface Finding {
  file: string;
  line: number;
  target: string;
  reason: string;
}

const findings: Finding[] = [];
const external = new Set<string>();

/** Dynamic segments and anchors are not statically checkable. */
function isCheckable(href: string): boolean {
  return !href.includes("[") && !href.includes("${") && !href.startsWith("#");
}

function checkAppLinks(relative: string, text: string) {
  const routes = appRoutes();
  const pattern = /(?:href|redirect|router\.push)\s*[=(]\s*["'`]([^"'`]+)["'`]/g;

  for (const match of text.matchAll(pattern)) {
    const href = match[1]!;
    if (!href.startsWith("/")) continue;
    if (href.startsWith("//")) continue; // protocol-relative URL

    const [pathname = "/"] = href.split(/[?#]/);
    if (pathname === "/" || pathname === "") {
      continue;
    }
    if (routes.has(pathname)) continue;
    // A parent segment is fine as long as some route starts with it.
    if ([...routes].some((route) => route.startsWith(pathname))) continue;

    const line = text.slice(0, match.index).split("\n").length;
    findings.push({ file: relative, line, target: href, reason: "no matching route" });
  }
}

function checkMarkdownLinks(relative: string, text: string) {
  const pattern = /\[[^\]]*\]\(([^)\s]+)\)/g;

  for (const match of text.matchAll(pattern)) {
    const target = match[1]!;

    if (/^https?:\/\//i.test(target)) {
      external.add(target);
      continue;
    }
    if (!isCheckable(target)) continue;

    const [pathname = target] = target.split(/[?#]/);
    const fromDir = path.dirname(path.join(ROOT, relative));
    const resolved = path.resolve(fromDir, decodeURIComponent(pathname));

    if (existsSync(resolved)) continue;

    const line = text.slice(0, match.index).split("\n").length;
    findings.push({ file: relative, line, target, reason: "file does not exist" });
  }
}

function checkBarePaths(relative: string, text: string) {
  // README code spans that claim to be a repository path: `src/lib/foo.ts`.
  //
  // A bare filename in prose - `classifier.ts` - is a reference to a file being
  // discussed, not a claim about where it lives, and the markdown link next to
  // it is what actually has to resolve. Only spans containing a separator are
  // treated as paths, so this check does not fight the prose.
  if (!relative.toLowerCase().endsWith("readme.md")) return;

  const pattern = /`([\w.-]+\/[\w./-]+\.(?:ts|tsx|json|md|yml|yaml|sh|mjs|prisma))`/g;
  for (const match of text.matchAll(pattern)) {
    const target = match[1] ?? "";
    if (existsSync(path.join(ROOT, target))) continue;
    const line = text.slice(0, match.index).split("\n").length;
    findings.push({ file: relative, line, target, reason: "path does not exist" });
  }
}

const files = walk(ROOT);
for (const file of files) {
  const relative = path.relative(ROOT, file).replace(/\\/g, "/");
  if (!TEXT.test(relative)) continue;

  let text: string;
  try {
    text = readFileSync(file, "utf8");
  } catch {
    continue;
  }

  checkAppLinks(relative, text);
  checkMarkdownLinks(relative, text);
  checkBarePaths(relative, text);
}

if (findings.length > 0) {
  console.error(`BROKEN REFERENCES - ${findings.length} finding(s):`);
  for (const finding of findings) {
    console.error(`  ${finding.file}:${finding.line} -> ${finding.target}  (${finding.reason})`);
  }
  process.exit(1);
}

console.log(
  `✓ Internal references clean across ${files.length} files (${external.size} external URL(s) listed, not fetched).`
);
