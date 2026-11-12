import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { DEFAULT_ORG_ID } from "@/lib/db";

export interface ApiSession {
  userId: string;
  organizationId: string;
}

/** Resolve the authenticated API caller and the organization they may read. */
export async function getApiSession(): Promise<ApiSession | null> {
  const session = await auth();
  if (!session?.user) return null;

  return {
    userId: session.user.id ?? session.user.email ?? "unknown",
    organizationId: DEFAULT_ORG_ID,
  };
}

export function unauthorized(): NextResponse {
  return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
}
