import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
