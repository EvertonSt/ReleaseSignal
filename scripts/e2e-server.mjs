#!/usr/bin/env node
/*
 * The three servers the end-to-end suite needs.
 *
 * WHY THIS IS A SCRIPT AND NOT A CI YAML BLOCK
 * Two of the three have to serve a build made WITHOUT demo mode, because the
 * ingestion endpoint's authorization check is skipped in demo mode - and demo
 * mode is inlined into the bundle at build time. A server environment variable
 * cannot turn it off; only a different build can.
 *
 *   :3100  demo build          - the main suite, and the demo banner
 *   :3101  non-demo, NO key    - proves the endpoint fails CLOSED with 503
 *   :3102  non-demo, WITH key  - proves 401 without/with a wrong token
 *
 * ORDER IS THE WHOLE TRICK
 * Playwright's webServer waits for a single URL before running the tests. The
 * demo server is started LAST, so by the time that URL answers, the two
 * authentication servers have already bound their ports. Starting them in
 * parallel and polling each would mean every spec grows its own wait loop; this
 * way "the demo server is up" and "the auth servers are up" are the same fact.
 *
 * It also produces a non-demo build, which is the artifact a deployment
 * actually needs. Before this existed the only build the project could make
 * was a demo one.
 */
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";

/*
 * `pnpm` is a shell script on POSIX and a `.cmd` on Windows, so it cannot be
 * executed directly on either platform. `shell: true` is required rather than
 * merely convenient, and every argument used here is free of spaces and shell
 * metacharacters - the only interpolated value is a port number.
 */
const SHELL = true;

const PORT_DEMO = Number(process.env.E2E_PORT ?? 3100);
const PORT_OPEN = PORT_DEMO + 1;
const PORT_KEYED = PORT_DEMO + 2;

const NON_DEMO_DIST = ".next-nodemo";

/** The bearer token the keyed server expects. A fixture, not a credential. */
const TEST_KEY = "e2e-ingest-key-not-a-real-secret";

const children = [];
let shuttingDown = false;

function log(message) {
  process.stdout.write(`[e2e-server] ${message}\n`);
}

function run(command, args, env, label) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, ...env },
      shell: SHELL,
    });

    const prefix = `[${label}] `;
    const forward = (stream, target) => {
      stream.setEncoding("utf8");
      let buffer = "";
      stream.on("data", (chunk) => {
        buffer += chunk;
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) target.write(prefix + line + "\n");
      });
    };
    forward(child.stdout, process.stdout);
    forward(child.stderr, process.stderr);

    child.on("error", reject);
    child.on("exit", (code) =>
      code === 0 ? resolve() : reject(new Error(`${label} exited with code ${code}`))
    );
  });
}

/**
 * Wait for a server to answer. `next start` binds the port slightly before it
 * is ready to serve, so binding alone is not a signal.
 */
async function waitFor(url, label, timeoutMs = 60_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(2_000) });
      // Any answer at all means the server is serving. The route does not need
      // to exist for this probe.
      if (response.status > 0) return;
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`${label} did not become ready within ${timeoutMs}ms`);
}

function startServer(port, env, label) {
  // A key present in the developer's own shell must not leak into the
  // "unconfigured" server, or the 503 path silently becomes a 401 and the test
  // proves nothing. Undefined is dropped by Node, but deleting the key is
  // explicit about the intent and does not depend on that.
  const childEnv = { ...process.env, ...env };
  for (const [key, value] of Object.entries(childEnv)) {
    if (value === undefined) delete childEnv[key];
  }

  const child = spawn("pnpm", ["exec", "next", "start", "--port", String(port)], {
    stdio: ["ignore", "pipe", "pipe"],
    env: childEnv,
    shell: SHELL,
  });
  const prefix = `[${label}] `;
  for (const stream of [child.stdout, child.stderr]) {
    stream.setEncoding("utf8");
    stream.on("data", (chunk) => process.stdout.write(prefix + chunk));
  }
  children.push(child);
  return child;
}

function shutdown(code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  log("stopping servers");
  for (const child of children) {
    try {
      child.kill();
    } catch {
      /* already gone */
    }
  }
  process.exit(code);
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

async function main() {
  log("building demo bundle");
  await run("pnpm", ["exec", "next", "build"], { NEXT_PUBLIC_DEMO_MODE: "true" }, "build:demo");

  log("building non-demo bundle");
  await run(
    "pnpm",
    ["exec", "next", "build"],
    { NEXT_PUBLIC_DEMO_MODE: "false", NEXT_DIST_DIR: NON_DEMO_DIST },
    "build:nodemo"
  );

  if (!existsSync(`${NON_DEMO_DIST}/BUILD_ID`)) {
    throw new Error(`non-demo build missing: ${NON_DEMO_DIST}/BUILD_ID not found`);
  }

  const nonDemoEnv = { NEXT_PUBLIC_DEMO_MODE: "false", NEXT_DIST_DIR: NON_DEMO_DIST };

  // The two authentication servers first, both from the same build. They differ
  // only in whether a key is configured, which is the entire point: 503 means
  // unconfigured, 401 means configured but not satisfied.
  startServer(PORT_OPEN, { ...nonDemoEnv, INGEST_API_KEY: undefined }, "auth-open");
  await waitFor(`http://127.0.0.1:${PORT_OPEN}/login`, `auth server :${PORT_OPEN}`);

  startServer(PORT_KEYED, { ...nonDemoEnv, INGEST_API_KEY: TEST_KEY }, "auth-keyed");
  await waitFor(`http://127.0.0.1:${PORT_KEYED}/login`, `keyed server :${PORT_KEYED}`);

  // Last: Playwright waits on this one.
  log(`demo server starting on :${PORT_DEMO}`);
  startServer(PORT_DEMO, { NEXT_PUBLIC_DEMO_MODE: "true" }, "demo");
  await waitFor(`http://127.0.0.1:${PORT_DEMO}/login`, `demo server :${PORT_DEMO}`);

  log(`ready — demo :${PORT_DEMO}, unconfigured :${PORT_OPEN}, keyed :${PORT_KEYED}`);
}

main().catch((error) => {
  process.stderr.write(`[e2e-server] FAILED: ${error.message}\n`);
  shutdown(1);
});
