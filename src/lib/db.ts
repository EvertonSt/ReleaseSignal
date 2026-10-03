// ── Database Client ────────────────────────────────────────────────────────
// Prisma client singleton. Lazy-loaded; only connects when DATABASE_URL is set.

import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export const DEFAULT_ORG_ID = "org_demo_001";

/**
 * The organization a request belongs to.
 *
 * Single-tenant today: every seeded record lives under one demo org. The
 * signature is deliberately sync - resolving this from a session would be
 * async, and declaring it async now would push an `await` into every caller
 * to buy nothing. TODO: derive from the authenticated session.
 */
export function getOrganizationId(): string {
  return DEFAULT_ORG_ID;
}

export function isDemoMode(): boolean {
  return process.env.NEXT_PUBLIC_DEMO_MODE === "true";
}

export { DEFAULT_ORG_ID as ORG_ID };
