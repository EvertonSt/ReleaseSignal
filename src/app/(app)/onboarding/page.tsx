"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import {
  Rocket,
  CheckCircle2,
  GitBranch,
  Shield,
  Users,
  Settings,
  ArrowRight,
  ArrowLeft,
  Check,
  Plus,
  X,
  ExternalLink,
  Lock,
  Eye,
  AlertTriangle,
  BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Step Definitions ────────────────────────────────────────────────────────

const steps = [
  { id: 1, title: "Welcome", subtitle: "Get started with ReleaseSignal", icon: Rocket },
  { id: 2, title: "Organization", subtitle: "Set up your organization profile", icon: Settings },
  { id: 3, title: "Connect GitHub", subtitle: "Install the GitHub App integration", icon: GitBranch },
  { id: 4, title: "Select Repos", subtitle: "Choose repositories to monitor", icon: CheckCircle2 },
  { id: 5, title: "Quality Gate", subtitle: "Configure release readiness rules", icon: Shield },
  { id: 6, title: "Import Data", subtitle: "Load demo data to explore", icon: BarChart3 },
  { id: 7, title: "Invite Team", subtitle: "Add collaborators", icon: Users },
  { id: 8, title: "Complete", subtitle: "You are ready to go", icon: Check },
];

/**
 * The step number is driven by the back/next buttons but also rewritten by the
 * demo import, so the lookup is clamped rather than trusted. A wizard with no
 * steps at all is a build-time mistake, not a runtime condition, and failing
 * loudly beats rendering an empty panel.
 */
function stepAt(step: number): (typeof steps)[number] {
  const index = Math.min(Math.max(step, 1), steps.length) - 1;
  const found = steps[index];
  const first = steps[0];
  if (!found || !first) throw new Error("The onboarding wizard needs at least one step");
  return found;
}

const defaultRepos = [
  { name: "acme-web", full: "acme-engineering/acme-web", lang: "TypeScript", tests: 847, checked: true },
  { name: "acme-api", full: "acme-engineering/acme-api", lang: "TypeScript", tests: 342, checked: true },
  {
    name: "acme-mobile",
    full: "acme-engineering/acme-mobile",
    lang: "TypeScript",
    tests: 198,
    checked: false,
  },
  {
    name: "acme-design-system",
    full: "acme-engineering/acme-design-system",
    lang: "TypeScript",
    tests: 278,
    checked: true,
  },
  {
    name: "acme-payments",
    full: "acme-engineering/acme-payments",
    lang: "TypeScript",
    tests: 156,
    checked: false,
  },
];

const defaultRules = [
  { id: "r1", rule: "Pass rate must be ≥ 95%", severity: "critical", enabled: true },
  { id: "r2", rule: "No new critical failures allowed", severity: "critical", enabled: true },
  { id: "r3", rule: "Flaky test rate must be < 5%", severity: "high", enabled: true },
  { id: "r4", rule: "Test suite must complete in < 10 minutes", severity: "medium", enabled: true },
  { id: "r5", rule: "Coverage must not decrease by > 1%", severity: "high", enabled: false },
  { id: "r6", rule: "Zero critical security vulnerabilities", severity: "critical", enabled: true },
];

// ── Main Component ──────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const [step, setStep] = useState(1);
  const [completed, setCompleted] = useState<number[]>([]);
  const [orgName, setOrgName] = useState("Acme Engineering");
  const [orgSlug, setOrgSlug] = useState("acme-engineering");
  const [repos, setRepos] = useState(defaultRepos);
  const [rules, setRules] = useState(defaultRules);
  const [demoImported, setDemoImported] = useState(false);
  const [importing, setImporting] = useState(false);
  const [teamEmails, setTeamEmails] = useState<{ email: string; role: string }[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("member");

  const totalSteps = steps.length;
  const currentStep = stepAt(step);
  const StepIcon = currentStep.icon;

  const goNext = useCallback(() => {
    setCompleted((prev) => [...new Set([...prev, step])]);
    if (step < totalSteps) setStep(step + 1);
  }, [step, totalSteps]);

  const goPrev = useCallback(() => {
    if (step > 1) setStep(step - 1);
  }, [step]);

  const toggleRepo = (name: string) => {
    setRepos((prev) => prev.map((r) => (r.name === name ? { ...r, checked: !r.checked } : r)));
  };

  const toggleRule = (id: string) => {
    setRules((prev) => prev.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r)));
  };

  const addInvite = () => {
    if (inviteEmail && inviteEmail.includes("@")) {
      setTeamEmails((prev) => [...prev, { email: inviteEmail, role: inviteRole }]);
      setInviteEmail("");
    }
  };

  const removeInvite = (email: string) => {
    setTeamEmails((prev) => prev.filter((i) => i.email !== email));
  };

  const startImport = () => {
    setImporting(true);
    setTimeout(() => {
      setImporting(false);
      setDemoImported(true);
    }, 2000);
  };

  const selectedCount = repos.filter((r) => r.checked).length;
  const enabledRules = rules.filter((r) => r.enabled).length;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto py-10 px-4">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <span className="text-xs font-bold text-primary-foreground">RS</span>
              </div>
              <h1 className="text-lg font-bold">Set Up ReleaseSignal</h1>
            </div>
            <span className="text-xs text-muted-foreground">
              Step {step} of {totalSteps}
            </span>
          </div>
          {/* Progress Bar */}
          <div className="flex gap-1">
            {steps.map((s) => (
              <div key={s.id} className="flex-1 relative group">
                <div
                  className={cn(
                    "h-1.5 rounded-full transition-colors duration-300",
                    completed.includes(s.id) ? "bg-success" : step === s.id ? "bg-primary" : "bg-muted"
                  )}
                />
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                  <span className="text-[10px] text-muted-foreground bg-card border border-border px-2 py-0.5 rounded whitespace-nowrap">
                    {s.title}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Step Content Card */}
        <div className="rounded-xl border bg-card p-8 mb-6">
          {/* Step Header */}
          <div className="flex items-center gap-3 mb-6 pb-5 border-b border-border">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <StepIcon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">{currentStep.title}</h2>
              <p className="text-xs text-muted-foreground">{currentStep.subtitle}</p>
            </div>
          </div>

          {/* ── Step 1: Welcome ── */}
          {step === 1 && (
            <div className="space-y-6">
              <p className="text-sm text-muted-foreground leading-relaxed">
                Welcome to ReleaseSignal! This setup wizard will guide you through connecting your GitHub
                repositories, configuring quality gates, importing demo data, and inviting your team. The
                entire process takes about 2 minutes.
              </p>
              <div className="grid sm:grid-cols-3 gap-4">
                {[
                  { icon: <Rocket className="h-5 w-5" />, title: "2 minutes", desc: "Quick guided setup" },
                  {
                    icon: <GitBranch className="h-5 w-5" />,
                    title: "GitHub App",
                    desc: "One-click repository access",
                  },
                  {
                    icon: <BarChart3 className="h-5 w-5" />,
                    title: "Demo data",
                    desc: "Explore immediately with samples",
                  },
                ].map((i) => (
                  <div key={i.title} className="rounded-xl border bg-muted/30 p-5 text-center">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-3 text-primary">
                      {i.icon}
                    </div>
                    <p className="font-semibold text-sm">{i.title}</p>
                    <p className="text-xs text-muted-foreground mt-1">{i.desc}</p>
                  </div>
                ))}
              </div>
              <div className="rounded-lg bg-info/5 border border-info/10 p-4 flex items-start gap-3">
                <AlertTriangle className="h-4 w-4 text-info mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-medium text-info">Demo Mode</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Real GitHub integration requires configuring a GitHub App in production.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Organization */}
          {step === 2 && (
            <div className="space-y-5">
              <p className="text-sm text-muted-foreground">Tell us about your organization.</p>
              <div className="space-y-4">
                <div>
                  <label htmlFor="onboarding-org-name" className="text-xs font-medium block mb-1.5">
                    Organization Name
                  </label>
                  <input
                    id="onboarding-org-name"
                    value={orgName}
                    onChange={(e) => {
                      setOrgName(e.target.value);
                      setOrgSlug(
                        e.target.value
                          .toLowerCase()
                          .replace(/[^a-z0-9]+/g, "-")
                          .replace(/^-|-$/g, "")
                      );
                    }}
                    className="w-full px-3 py-2.5 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div>
                  <label htmlFor="onboarding-org-slug" className="text-xs font-medium block mb-1.5">
                    Slug
                  </label>
                  <div className="flex items-center">
                    <span className="text-xs text-muted-foreground mr-1">releasesignal.dev/</span>
                    <input
                      id="onboarding-org-slug"
                      value={orgSlug}
                      onChange={(e) => setOrgSlug(e.target.value)}
                      className="flex-1 px-3 py-2.5 rounded-lg border bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="onboarding-timezone" className="text-xs font-medium block mb-1.5">
                      Timezone
                    </label>
                    <select
                      id="onboarding-timezone"
                      className="w-full px-3 py-2.5 rounded-lg border bg-background text-sm"
                    >
                      <option>America/Sao_Paulo (BRT)</option>
                      <option>America/New_York (EST)</option>
                      <option>Europe/London (GMT)</option>
                      <option>UTC</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="onboarding-default-branch" className="text-xs font-medium block mb-1.5">
                      Default Branch
                    </label>
                    <input
                      id="onboarding-default-branch"
                      defaultValue="main"
                      className="w-full px-3 py-2.5 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Connect GitHub */}
          {step === 3 && (
            <div className="space-y-5">
              <p className="text-sm text-muted-foreground">
                Install the ReleaseSignal GitHub App to grant read-only access to your repositories and CI
                workflows.
              </p>
              <div className="rounded-xl border border-dashed p-10 text-center">
                <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
                  <GitBranch className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium mb-1">Install the ReleaseSignal GitHub App</p>
                <p className="text-xs text-muted-foreground mb-5 max-w-sm mx-auto">
                  We only request read access to metadata, checks, and workflow runs.
                </p>
                <button className="px-6 py-2.5 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors inline-flex items-center gap-2">
                  <ExternalLink className="h-4 w-4" /> Install GitHub App
                </button>
              </div>
              <div className="grid sm:grid-cols-3 gap-3">
                {[
                  { icon: <Eye className="h-4 w-4" />, t: "Read-only", d: "No write access" },
                  { icon: <Lock className="h-4 w-4" />, t: "Least privilege", d: "Minimal permissions" },
                  { icon: <CheckCircle2 className="h-4 w-4" />, t: "Reversible", d: "Uninstall anytime" },
                ].map((f) => (
                  <div key={f.t} className="flex items-start gap-2.5 p-3 rounded-lg bg-muted/30">
                    <span className="text-primary mt-0.5">{f.icon}</span>
                    <div>
                      <p className="text-xs font-medium">{f.t}</p>
                      <p className="text-[11px] text-muted-foreground">{f.d}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="rounded-lg bg-warning/5 border border-warning/10 p-3 flex items-start gap-2">
                <AlertTriangle className="h-3.5 w-3.5 text-warning mt-0.5 shrink-0" />
                <p className="text-xs text-muted-foreground">
                  In demo mode, the GitHub integration is simulated.
                </p>
              </div>
            </div>
          )}

          {/* Step 4: Select Repositories */}
          {step === 4 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Select repositories to monitor.</p>
                <span className="text-xs text-primary font-medium">{selectedCount} selected</span>
              </div>
              <div className="space-y-2">
                {repos.map((repo) => (
                  <div
                    key={repo.name}
                    className={cn(
                      "relative flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-all",
                      repo.checked ? "bg-primary/5 border-primary/20" : "bg-muted/20 hover:bg-muted/40"
                    )}
                  >
                    <input
                      id={`repo-${repo.name}`}
                      type="checkbox"
                      checked={repo.checked}
                      onChange={() => toggleRepo(repo.name)}
                      className="rounded border-border"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{repo.name}</p>
                      <p className="text-xs text-muted-foreground">{repo.full}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs text-muted-foreground">{repo.lang}</p>
                      <p className="text-xs font-medium">{repo.tests} tests</p>
                    </div>
                    <label htmlFor={`repo-${repo.name}`} className="absolute inset-0 cursor-pointer">
                      <span className="sr-only">Monitor {repo.name}</span>
                    </label>
                  </div>
                ))}
              </div>
              <button className="w-full p-3 rounded-xl border border-dashed text-sm text-muted-foreground hover:bg-muted/30 transition-colors flex items-center justify-center gap-2">
                <Plus className="h-4 w-4" /> Add another repository
              </button>
            </div>
          )}

          {/* Step 5: Quality Gate */}
          {step === 5 && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Configure rules that determine release readiness.
              </p>
              <div className="space-y-2">
                {rules.map((rule) => (
                  <div
                    key={rule.id}
                    className={cn(
                      "flex items-center gap-4 p-4 rounded-xl border transition-all",
                      rule.enabled ? "bg-muted/30" : "bg-muted/10 opacity-60"
                    )}
                  >
                    <button
                      onClick={() => toggleRule(rule.id)}
                      className={cn(
                        "w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors",
                        rule.enabled ? "bg-primary border-primary" : "border-border"
                      )}
                    >
                      {rule.enabled && <Check className="h-3 w-3 text-primary-foreground" />}
                    </button>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{rule.rule}</p>
                    </div>
                    <span
                      className={cn(
                        "text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase",
                        rule.severity === "critical"
                          ? "bg-destructive/15 text-destructive"
                          : rule.severity === "high"
                            ? "bg-warning/15 text-warning"
                            : "bg-info/15 text-info"
                      )}
                    >
                      {rule.severity}
                    </span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground text-center">
                {enabledRules} of {rules.length} rules enabled
              </p>
            </div>
          )}

          {/* Step 6: Import Demo Data */}
          {step === 6 && (
            <div className="space-y-5">
              <p className="text-sm text-muted-foreground">
                Load synthetic test data to explore ReleaseSignal before connecting your real CI pipeline.
              </p>
              <div className="rounded-lg bg-warning/5 border border-warning/10 p-3 flex items-start gap-2">
                <AlertTriangle className="h-3.5 w-3.5 text-warning mt-0.5 shrink-0" />
                <p className="text-xs text-muted-foreground">
                  All demo data is synthetic and clearly labeled throughout the application.
                </p>
              </div>
              {!demoImported ? (
                <>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {[
                      { l: "60 test runs", d: "Last 30 days" },
                      { l: "10 flaky tests", d: "With quarantine workflows" },
                      { l: "5 failure clusters", d: "With AI explanations" },
                      { l: "3 quality gates", d: "With evaluation history" },
                      { l: "8 repositories", d: "Across 4 teams" },
                      { l: "4 PR reports", d: "With quality scores" },
                    ].map((i) => (
                      <div key={i.l} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                        <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                        <div>
                          <p className="text-sm font-medium">{i.l}</p>
                          <p className="text-xs text-muted-foreground">{i.d}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={startImport}
                    disabled={importing}
                    className="w-full px-4 py-3 rounded-xl text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {importing ? (
                      <>
                        <span className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />{" "}
                        Importing...
                      </>
                    ) : (
                      <>
                        <BarChart3 className="h-4 w-4" /> Import Demo Data
                      </>
                    )}
                  </button>
                </>
              ) : (
                <div className="rounded-xl bg-success/5 border border-success/20 p-6 text-center">
                  <CheckCircle2 className="h-10 w-10 text-success mx-auto mb-3" />
                  <p className="font-medium text-sm">Demo data imported successfully</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    60 test runs, 10 flaky tests, 5 failure clusters, and 3 quality gates loaded.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Step 7: Invite Team */}
          {step === 7 && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Invite team members to collaborate. You can also do this later from Settings.
              </p>
              <div className="flex gap-2">
                <input
                  type="email"
                  placeholder="email@company.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addInvite()}
                  className="flex-1 px-3 py-2.5 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="px-3 py-2.5 rounded-lg border bg-background text-sm"
                >
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                  <option value="viewer">Viewer</option>
                </select>
                <button
                  onClick={addInvite}
                  className="px-4 py-2.5 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shrink-0"
                >
                  Invite
                </button>
              </div>
              {teamEmails.length > 0 && (
                <div className="space-y-2">
                  {teamEmails.map((inv) => (
                    <div
                      key={inv.email}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-medium text-primary">
                          {inv.email.slice(0, 1).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{inv.email}</p>
                          <p className="text-[11px] text-muted-foreground capitalize">{inv.role}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => removeInvite(inv.email)}
                        className="p-1 rounded hover:bg-muted transition-colors"
                      >
                        <X className="h-3.5 w-3.5 text-muted-foreground" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="rounded-lg bg-muted/30 p-4 text-center">
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium">Admin</span> — manage settings ·{" "}
                  <span className="font-medium">Member</span> — triage and view ·{" "}
                  <span className="font-medium">Viewer</span> — read-only
                </p>
              </div>
            </div>
          )}

          {/* Step 8: Complete */}
          {step === 8 && (
            <div className="space-y-6 text-center">
              <div className="w-20 h-20 rounded-full bg-success/10 flex items-center justify-center mx-auto">
                <CheckCircle2 className="h-10 w-10 text-success" />
              </div>
              <div>
                <h3 className="text-xl font-bold mb-2">You are all set!</h3>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  ReleaseSignal is configured for{" "}
                  <span className="font-medium text-foreground">{orgName}</span>.
                </p>
              </div>
              <div className="grid sm:grid-cols-3 gap-3 text-left max-w-lg mx-auto">
                {[
                  { t: "Dashboard", d: "Release health", h: "/dashboard" },
                  { t: "Test Runs", d: "CI run history", h: "/test-runs" },
                  { t: "Quality Gates", d: "Release rules", h: "/quality-gates" },
                ].map((i) => (
                  <Link
                    key={i.t}
                    href={i.h}
                    className="rounded-xl border p-4 hover:bg-muted/30 transition-colors group"
                  >
                    <p className="text-sm font-medium group-hover:text-primary transition-colors">{i.t}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{i.d}</p>
                  </Link>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                {selectedCount} repos · {enabledRules} rules · {teamEmails.length} members
                {demoImported ? " · Demo data loaded" : ""}
              </p>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={goPrev}
            disabled={step === 1}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium border border-border transition-colors",
              step === 1 ? "opacity-40 cursor-not-allowed" : "hover:bg-accent"
            )}
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
          {step < totalSteps ? (
            <button
              onClick={goNext}
              className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Continue <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <Link
              href="/dashboard"
              className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Go to Dashboard <ArrowRight className="h-4 w-4" />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
