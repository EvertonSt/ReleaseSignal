import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  GitPullRequest,
  BarChart3,
  Bug,
  TrendingUp,
  Eye,
  Target,
  Layers,
  Lock,
  Globe,
  FileText,
} from "lucide-react";

const caps = [
  { i: BarChart3, t: "Release Health Scoring", d: "Real-time quality metrics with trend analysis." },
  {
    i: AlertTriangle,
    t: "Failure Classification",
    d: "Fourteen deterministic rules categorize every failure.",
  },
  { i: Bug, t: "Flaky Test Detection", d: "Statistical flake detection with quarantine workflows." },
  { i: TrendingUp, t: "Regression Detection", d: "Automated comparison against historical baselines." },
  { i: GitPullRequest, t: "PR Quality Reports", d: "Automated quality gates for every pull request." },
  { i: Eye, t: "Test Run History", d: "Complete audit trail of every test run." },
  { i: Target, t: "Failure Clustering", d: "Automatic grouping of related failures." },
  { i: Layers, t: "Performance Analysis", d: "Duration trends and performance budgets." },
  { i: Lock, t: "Human Triage", d: "Override controls with full audit history." },
  { i: Globe, t: "CI/CD Integration", d: "GitHub Actions and generic CI upload." },
  { i: FileText, t: "Shareable Reports", d: "Quality reports with expiration and revocation." },
];

const steps = [
  { n: "1", t: "Connect a repository", d: "Install the GitHub App or configure a CI upload endpoint." },
  { n: "2", t: "Receive CI data", d: "Automatically ingest test results from every pipeline." },
  {
    n: "3",
    t: "Classify failures",
    d: "Deterministic rules categorize each failure, with the evidence attached.",
  },
  { n: "4", t: "Compare with baselines", d: "Every result compared against established patterns." },
  { n: "5", t: "Review evidence", d: "See the why behind every classification." },
  { n: "6", t: "Apply quality gate", d: "Configurable rules determine pass, warning, or blocked." },
  { n: "7", t: "Ship with decision", d: "Every release carries a clear quality assessment." },
];

export default function HomePage() {
  return (
    <div>
      <section className="relative overflow-hidden bg-background py-24 sm:py-32">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-sm font-medium text-primary mb-4">
            Explainable quality gates for confident releases
          </p>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
            Turn every test run into a<span className="text-primary"> release decision.</span>
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground mb-8">
            ReleaseSignal turns CI results, flaky tests, and regression signals into an explainable quality
            gate your team can trust.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Explore live demo <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href="#pricing"
              className="inline-flex items-center gap-2 rounded-lg border border-border px-6 py-3 text-sm font-medium hover:bg-accent"
            >
              Book a technical walkthrough
            </a>
          </div>
        </div>
      </section>
      <section className="py-20 bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-4">The problem with CI output</h2>
          <p className="text-center text-muted-foreground max-w-2xl mx-auto mb-12">
            Teams with automated tests still struggle to make confident release decisions.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              "A failed test does not always mean a product regression.",
              "Flaky tests waste engineering time.",
              "Environment failures create false alarms.",
              "Performance degradation enters unnoticed.",
              "CI output is too technical or fragmented.",
              "Release decisions use incomplete information.",
            ].map((t, i) => (
              <div key={i} className="rounded-lg border bg-card p-5">
                <AlertTriangle className="h-5 w-5 text-warning mb-3" />
                <p className="text-sm">{t}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section id="capabilities" className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-12">Capabilities</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {caps.map((c) => (
              <div key={c.t} className="rounded-lg border bg-card p-5 hover:bg-accent/30 transition-colors">
                <c.i className="h-5 w-5 text-primary mb-3" />
                <h3 className="font-medium text-sm mb-1">{c.t}</h3>
                <p className="text-xs text-muted-foreground">{c.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section id="how-it-works" className="py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-2">How it works</h2>
          <p className="text-sm text-muted-foreground text-center mb-12 max-w-xl mx-auto">
            From raw CI output to a decision a reviewer can defend, in seven steps and no black box.
          </p>
          <ol className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map((s) => (
              <li key={s.n} className="rounded-lg border bg-card p-5">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary mb-3">
                  {s.n}
                </span>
                <h3 className="font-medium text-sm mb-1">{s.t}</h3>
                <p className="text-xs text-muted-foreground">{s.d}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>
      <section id="pricing" className="py-20 bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-12">Custom Deployment</h2>
          <div className="max-w-lg mx-auto rounded-xl border bg-card p-8">
            <h3 className="text-xl font-bold mb-2">ReleaseSignal Custom Deployment</h3>
            <p className="text-3xl font-bold text-primary mb-4">Starting at US$10,000</p>
            <ul className="space-y-2 text-sm text-muted-foreground mb-6">
              {[
                "Core quality intelligence platform",
                "GitHub and CI integration",
                "Custom quality-gate rules",
                "Deployment and configuration",
                "Team onboarding",
                "Documentation and handover",
              ].map((i) => (
                <li key={i} className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-success shrink-0" /> {i}
                </li>
              ))}
            </ul>
            <a
              href="mailto:contact@releasesignal.dev"
              className="block w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground text-center hover:bg-primary/90"
            >
              Book a technical walkthrough
            </a>
          </div>
        </div>
      </section>
      <section id="about" className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-4">About the builder</h2>
            <p className="text-muted-foreground mb-6">
              ReleaseSignal is built by <strong>Everton S. Andrade</strong>, a Brazil-based QA Automation
              Engineer focused on making software quality observable, repeatable, and actionable.
            </p>
            <div className="flex justify-center gap-4">
              <a
                href="https://github.com/EvertonSt"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm hover:bg-accent"
              >
                GitHub
              </a>
              <a
                href="https://www.linkedin.com/in/everton-s-andrade-760407128/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm hover:bg-accent"
              >
                LinkedIn
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
