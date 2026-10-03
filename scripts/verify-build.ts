import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

/**
 * Verifies that a production build exists and carries what the project claims.
 *
 * `next build` exiting zero says the code compiles. It does not say the routes
 * were emitted, and it does not say the security headers survived. This gate
 * checks the artefacts themselves, so "the build is green" and "the app serves
 * the pages the README describes" are the same claim.
 */

const ROOT = process.cwd();
const BUILD_DIR = path.join(ROOT, ".next");
const SERVER_DIR = path.join(BUILD_DIR, "server", "app");

interface Finding {
  subject: string;
  reason: string;
}

const findings: Finding[] = [];

function fail(subject: string, reason: string) {
  findings.push({ subject, reason });
}

/** Routes the README and the e2e suite both promise. */
const REQUIRED_ROUTES = [
  "/",
  "/dashboard",
  "/test-runs",
  "/failures",
  "/flaky-tests",
  "/quality-gates",
  "/pull-requests",
  "/performance",
  "/reports",
  "/settings",
  "/onboarding",
  "/login",
  "/api/health",
  "/api/runs",
  "/api/failures",
  "/api/gates",
  "/api/ingress",
  "/api/classify",
];

/** Headers that must be present on every response. */
const REQUIRED_HEADERS = [
  "X-Frame-Options",
  "X-Content-Type-Options",
  "Referrer-Policy",
  "Permissions-Policy",
];

if (!existsSync(BUILD_DIR)) {
  console.error("✗ No .next directory. Run `pnpm build` first.");
  process.exit(1);
}

if (!existsSync(path.join(BUILD_DIR, "build-manifest.json"))) {
  fail(".next/build-manifest.json", "missing; the build did not complete");
}

// ---- routes -----------------------------------------------------------------

if (!existsSync(SERVER_DIR)) {
  fail(".next/server/app", "missing; no app routes were emitted");
} else {
  const emitted = new Set<string>();
  const collect = (dir: string, prefix: string) => {
    for (const entry of readdirSync(dir)) {
      const full = path.join(dir, entry);
      if (statSync(full).isDirectory()) {
        // Route groups like `(app)` organise files without adding a segment.
        const isGroup = entry.startsWith("(") && entry.endsWith(")");
        collect(full, isGroup ? prefix : `${prefix}/${entry}`);
        continue;
      }
      if (entry === "page.js" || entry === "route.js") emitted.add(prefix);
      // A statically prerendered route is emitted as `index.html` rather than a
      // directory containing `page.js`, so the root route is invisible to a
      // collector that only looks for the module.
      if (entry === "index.html") emitted.add(prefix || "/");
    }
  };
  collect(SERVER_DIR, "");

  for (const route of REQUIRED_ROUTES) {
    if (!emitted.has(route)) {
      fail(`route ${route}`, "not emitted by the build");
    }
  }
  console.log(`  routes emitted: ${emitted.size}`);
}

// ---- static assets ----------------------------------------------------------

const staticDir = path.join(BUILD_DIR, "static");
if (!existsSync(staticDir)) {
  fail(".next/static", "missing; no client assets were emitted");
} else {
  let assetCount = 0;
  const count = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      const full = path.join(dir, entry);
      if (statSync(full).isDirectory()) count(full);
      else assetCount += 1;
    }
  };
  count(staticDir);
  if (assetCount === 0) fail(".next/static", "empty");
  console.log(`  client assets: ${assetCount}`);
}

// ---- security headers -------------------------------------------------------

const configPath = path.join(ROOT, "next.config.ts");
if (existsSync(configPath)) {
  const config = readFileSync(configPath, "utf8");
  for (const header of REQUIRED_HEADERS) {
    if (!config.includes(header)) {
      fail(`next.config.ts`, `does not set ${header}`);
    }
  }
}

// ---- version agreement ------------------------------------------------------

const pkg = JSON.parse(readFileSync(path.join(ROOT, "package.json"), "utf8")) as {
  name: string;
  version: string;
};
const healthRoute = path.join(ROOT, "src", "app", "api", "health", "route.ts");
if (existsSync(healthRoute)) {
  const health = readFileSync(healthRoute, "utf8");
  // The endpoint imports the version rather than repeating it. A literal here
  // would drift from package.json without anything noticing.
  if (/\bversion\s*:\s*["']\d/.test(health)) {
    fail("src/app/api/health/route.ts", "hard-codes a version; read it from package.json");
  }
  if (!health.includes("package.json")) {
    fail("src/app/api/health/route.ts", "does not source the version from package.json");
  }
}
console.log(`  package: ${pkg.name}@${pkg.version}`);

// ---- verdict ----------------------------------------------------------------

if (findings.length > 0) {
  console.error(`\n✗ Build verification failed - ${findings.length} finding(s):`);
  for (const finding of findings) {
    console.error(`  ${finding.subject}: ${finding.reason}`);
  }
  process.exit(1);
}

console.log("✓ Build artefacts present, routes emitted, security headers declared.");
