import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";

export const { handlers, signIn, signOut, auth } = NextAuth({
  /*
   * Both deployment targets put this app behind a reverse proxy: the nginx
   * service in docker-compose.yml and the platform router on Vercel. Auth.js
   * refuses to build a callback URL from a host it does not recognise, so
   * without this every /api/auth call fails with UntrustedHost and the OAuth
   * round trip never completes - which is what the login flow *is*.
   *
   * The trust extends to X-Forwarded-Host, so the proxy in front of this app
   * must set that header from a value it controls rather than pass the client's
   * through unchanged. That is the default in both targets.
   */
  trustHost: true,
  providers: [
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
    }),
  ],
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: {
    strategy: "jwt",
  },
  callbacks: {
    authorized({ auth, request }) {
      const isLoggedIn = !!auth?.user;
      const isOnApp =
        request.nextUrl.pathname.startsWith("/dashboard") ||
        request.nextUrl.pathname.startsWith("/test-runs") ||
        request.nextUrl.pathname.startsWith("/failures") ||
        request.nextUrl.pathname.startsWith("/flaky-tests") ||
        request.nextUrl.pathname.startsWith("/quality-gates") ||
        request.nextUrl.pathname.startsWith("/pull-requests") ||
        request.nextUrl.pathname.startsWith("/performance") ||
        request.nextUrl.pathname.startsWith("/reports") ||
        request.nextUrl.pathname.startsWith("/settings") ||
        request.nextUrl.pathname.startsWith("/onboarding");

      // In demo mode, allow access to all routes
      if (process.env.NEXT_PUBLIC_DEMO_MODE === "true") {
        return true;
      }

      if (isOnApp && !isLoggedIn) {
        return Response.redirect(new URL("/login", request.nextUrl));
      }
      return true;
    },
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.name = user.name;
        token.email = user.email;
        token.picture = user.image;
      }
      return token;
    },
    /*
     * The JWT arrives as a typed `unknown` bag rather than a declared shape,
     * and NextAuth re-exports its Session and JWT interfaces from `@auth/core`,
     * which makes `declare module "next-auth"` a no-op rather than a merge.
     * Narrowing field by field is therefore both the honest option and the safe
     * one: a token that predates a field contributes nothing instead of writing
     * `undefined` over a name the UI renders.
     */
    session({ session, token }) {
      if (typeof token.id === "string") session.user.id = token.id;
      if (typeof token.name === "string") session.user.name = token.name;
      if (typeof token.email === "string") session.user.email = token.email;
      if (typeof token.picture === "string") session.user.image = token.picture;
      return session;
    },
  },
});
