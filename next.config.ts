import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /*
   * A DEMO BUILD MUST NEVER BE DEPLOYED.
   *
   * `NEXT_PUBLIC_DEMO_MODE` is inlined into the bundle at build time, so a
   * build made with it enabled has demo mode compiled in permanently. The
   * ingestion endpoint's authorization check is compiled out with it, and no
   * amount of reconfiguring the server brings it back - which makes an
   * accidental demo deploy an unauthenticated write endpoint on the public
   * internet.
   *
   * This repository's own vercel.json used to set that variable to "true",
   * which is precisely how it would have happened. A warning in a README does
   * not stop anyone; a build that refuses to finish does.
   *
   * The end-to-end suite deliberately builds in demo mode, so the guard is
   * scoped to deployment environments (Vercel sets VERCEL=1) and can be
   * overridden explicitly with ALLOW_DEMO_BUILD=1 for anyone who genuinely
   * wants to publish a demo.
   */
  ...(process.env.NEXT_PUBLIC_DEMO_MODE === "true" && process.env.VERCEL
    ? (() => {
        if (process.env.ALLOW_DEMO_BUILD === "1") return {};
        throw new Error(
          "Refusing to build for deployment with NEXT_PUBLIC_DEMO_MODE=true.\n" +
            "Demo mode is compiled into the bundle, which disables the authorization\n" +
            "check on POST /api/ingress. Unset it, or set ALLOW_DEMO_BUILD=1 if you\n" +
            "really intend to publish a demo instance."
        );
      })()
    : {}),

  /*
   * Build output directory, overridable so two builds can coexist on one
   * machine.
   *
   * This exists for the end-to-end suite, which has to prove that the
   * ingestion endpoint rejects unauthorised writes. That check is skipped in
   * demo mode, and demo mode is inlined into the bundle at build time - so
   * testing the non-demo path needs a genuinely different build, not just a
   * different server environment.
   *
   * It is equally the missing piece for deployment: the README says a demo
   * build must never ship, and until this existed there was no way to produce
   * a non-demo build beside one.
   */
  distDir: process.env.NEXT_DIST_DIR ?? ".next",

  // Use standalone output only for Docker/self-hosted deployments.
  // Vercel handles its own serverless output format automatically.
  ...(process.env.BUILD_STANDALONE === "true" ? { output: "standalone" } : {}),

  // Enable server-side environment variables
  serverExternalPackages: ["@prisma/client", "ioredis"],

  // Image optimization
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com",
      },
    ],
  },

  // Security headers
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
