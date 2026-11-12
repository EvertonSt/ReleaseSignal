import { NextResponse, type NextRequest } from "next/server";
import { DEMO_COOKIE, DEMO_COOKIE_MAX_AGE, DEMO_COOKIE_VALUE } from "@/lib/demo";

/**
 * Enter the synthetic demo without changing the production auth provider.
 * The cookie only grants the app shell; it does not authorize ingestion or
 * make demo data available through the production API.
 */
export function GET(request: NextRequest) {
  const response = NextResponse.redirect(new URL("/dashboard", request.url));

  response.cookies.set({
    name: DEMO_COOKIE,
    value: DEMO_COOKIE_VALUE,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: DEMO_COOKIE_MAX_AGE,
  });

  return response;
}
