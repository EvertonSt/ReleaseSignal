import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

/**
 * Next.js 16 renamed the `middleware` convention to `proxy`. The export is
 * unchanged; only the filename moved.
 *
 * The route policy - which paths need a session and where an unauthenticated
 * visitor is sent - lives in the `authorized` callback in `src/lib/auth.ts`.
 * This file exists only to give Auth.js somewhere to run it. It previously kept
 * its own copy of the allow-list, and the two had already drifted: this one
 * exempted `/` and `/login`, that one did not. Two lists that must agree is
 * one more than a codebase should have.
 */
export default auth(() => NextResponse.next());

export const config = {
  // Everything except Next's own assets and files served straight from public.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|public/).*)"],
};
