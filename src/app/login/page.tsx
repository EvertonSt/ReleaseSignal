"use client";

import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { AlertTriangle, Shield, CheckCircle2, ArrowRight } from "lucide-react";

function LoginForm() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center mx-auto mb-4">
            <span className="text-lg font-bold text-primary-foreground">RS</span>
          </div>
          <h1 className="text-2xl font-bold">ReleaseSignal</h1>
          <p className="text-sm text-muted-foreground mt-1">AI QA Intelligence for Confident Releases</p>
        </div>

        {/* Login Card */}
        <div className="rounded-xl border bg-card p-8">
          <h2 className="text-lg font-semibold text-center mb-1">Sign in to your account</h2>
          <p className="text-sm text-muted-foreground text-center mb-6">
            Connect with your GitHub account to continue
          </p>

          {/* Error Message */}
          {error && (
            <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 mb-4 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-medium text-destructive">Authentication Error</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {error === "OAuthSignin" && "Error starting GitHub sign-in. Check your configuration."}
                  {error === "OAuthCallback" && "Error during GitHub callback. Please try again."}
                  {error === "OAuthCreateAccount" && "Could not create account. Please try again."}
                  {error === "EmailCreateAccount" && "Could not create account with this email."}
                  {error === "Default" && "An error occurred. Please try again."}
                  {![
                    "OAuthSignin",
                    "OAuthCallback",
                    "OAuthCreateAccount",
                    "EmailCreateAccount",
                    "Default",
                  ].includes(error) && `Error: ${error}`}
                </p>
              </div>
            </div>
          )}

          {/* GitHub Sign In Button */}
          <button
            onClick={() => {
              // `signIn` navigates away; the promise never settles in this tab,
              // so an unhandled rejection here would be noise rather than signal.
              void signIn("github", { callbackUrl });
            }}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
            </svg>
            Sign in with GitHub
            <ArrowRight className="h-4 w-4" />
          </button>

          {/* Demo Mode */}
          <div className="mt-6 rounded-lg bg-warning/5 border border-warning/10 p-3 flex items-start gap-2">
            <AlertTriangle className="h-3.5 w-3.5 text-warning mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-medium text-warning">Demo Mode</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                In demo mode, sign-in is simulated. You can explore the full product without authentication.
              </p>
            </div>
          </div>

          {/* Demo Access Button */}
          <a
            href="/dashboard"
            className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-border text-sm font-medium hover:bg-accent transition-colors"
          >
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
            Continue in Demo Mode
          </a>
        </div>

        {/* Features */}
        <div className="mt-6 grid grid-cols-3 gap-3">
          {[
            { icon: <Shield className="h-4 w-4" />, title: "Secure", desc: "OAuth 2.0" },
            { icon: <CheckCircle2 className="h-4 w-4" />, title: "Sandboxed", desc: "Read-only access" },
            { icon: <AlertTriangle className="h-4 w-4" />, title: "Reversible", desc: "Uninstall anytime" },
          ].map((f) => (
            <div key={f.title} className="text-center">
              <div className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center mx-auto mb-1.5 text-muted-foreground">
                {f.icon}
              </div>
              <p className="text-[11px] font-medium">{f.title}</p>
              <p className="text-[10px] text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground mt-6">
          By signing in, you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center">
          <span className="text-muted-foreground text-sm">Loading...</span>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
