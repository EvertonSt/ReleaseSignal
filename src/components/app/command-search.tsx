"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  LayoutDashboard,
  ListChecks,
  AlertTriangle,
  Bug,
  Shield,
  GitPullRequest,
  Activity,
  FileText,
  Settings,
  ArrowRight,
  Clock,
  Hash,
} from "lucide-react";

interface SearchItem {
  id: string;
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  href: string;
  category: string;
  keywords: string[];
}

const searchItems: SearchItem[] = [
  {
    id: "dash",
    title: "Dashboard",
    subtitle: "Release health overview",
    icon: <LayoutDashboard className="h-4 w-4" />,
    href: "/dashboard",
    category: "Navigation",
    keywords: ["home", "overview", "health"],
  },
  {
    id: "runs",
    title: "Test Runs",
    subtitle: "All test run history",
    icon: <ListChecks className="h-4 w-4" />,
    href: "/test-runs",
    category: "Navigation",
    keywords: ["tests", "ci", "pipeline"],
  },
  {
    id: "fail",
    title: "Failures",
    subtitle: "Failure intelligence",
    icon: <AlertTriangle className="h-4 w-4" />,
    href: "/failures",
    category: "Navigation",
    keywords: ["error", "broken", "regression", "classify"],
  },
  {
    id: "flake",
    title: "Flaky Tests",
    subtitle: "Quarantine and remediation",
    icon: <Bug className="h-4 w-4" />,
    href: "/flaky-tests",
    category: "Navigation",
    keywords: ["unstable", "intermittent", "quarantine"],
  },
  {
    id: "gate",
    title: "Quality Gates",
    subtitle: "Gate rules and evaluations",
    icon: <Shield className="h-4 w-4" />,
    href: "/quality-gates",
    category: "Navigation",
    keywords: ["policy", "block", "pass", "warn"],
  },
  {
    id: "pr",
    title: "Pull Requests",
    subtitle: "PR quality reports",
    icon: <GitPullRequest className="h-4 w-4" />,
    href: "/pull-requests",
    category: "Navigation",
    keywords: ["merge", "review", "check"],
  },
  {
    id: "perf",
    title: "Performance",
    subtitle: "Duration trends and regressions",
    icon: <Activity className="h-4 w-4" />,
    href: "/performance",
    category: "Navigation",
    keywords: ["duration", "p50", "p95", "slow", "budget"],
  },
  {
    id: "reports",
    title: "Reports",
    subtitle: "Generated quality reports",
    icon: <FileText className="h-4 w-4" />,
    href: "/reports",
    category: "Navigation",
    keywords: ["export", "share", "weekly"],
  },
  {
    id: "settings",
    title: "Settings",
    subtitle: "Organization and integration",
    icon: <Settings className="h-4 w-4" />,
    href: "/settings",
    category: "Navigation",
    keywords: ["config", "team", "api", "branding"],
  },
  {
    id: "onboard",
    title: "Onboarding",
    subtitle: "Setup wizard",
    icon: <ArrowRight className="h-4 w-4" />,
    href: "/onboarding",
    category: "Actions",
    keywords: ["setup", "connect", "github", "invite"],
  },
  {
    id: "run-latest",
    title: "Latest Test Run",
    subtitle: "acme-web · main · a3f2c1d",
    icon: <Clock className="h-4 w-4" />,
    href: "/test-runs",
    category: "Recent",
    keywords: ["latest", "recent", "last"],
  },
  {
    id: "gate-prod",
    title: "Production Gate",
    subtitle: "Currently passing",
    icon: <Shield className="h-4 w-4" />,
    href: "/quality-gates",
    category: "Recent",
    keywords: ["production", "release"],
  },
];

interface CommandSearchProps {
  open: boolean;
  onClose: () => void;
}

export function CommandSearch({ open, onClose }: CommandSearchProps) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  /*
   * The palette must start empty every time it opens. Adjusting the query
   * during render is React's documented pattern for state that follows a prop;
   * doing it from an effect would cost an extra render pass on every open, and
   * setState-in-effect is exactly the cascading-render smell that rule exists
   * to catch.
   */
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setQuery("");
  }

  // Focus is a DOM side effect, so it stays in an effect. One frame is enough
  // for the dialog to mount and no longer needs to be torn down by a timeout.
  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [open]);

  // ⌘K / Ctrl+K global listener
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        if (open) {
          onClose();
        } else {
          // Parent handles opening
        }
      }
      if (e.key === "Escape" && open) {
        onClose();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  const filtered = useMemo(() => {
    if (!query.trim()) return searchItems;
    const q = query.toLowerCase();
    return searchItems.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.subtitle?.toLowerCase().includes(q) ||
        item.keywords.some((k) => k.includes(q)) ||
        item.category.toLowerCase().includes(q)
    );
  }, [query]);

  const grouped = useMemo(() => {
    const groups: Record<string, SearchItem[]> = {};
    for (const item of filtered) {
      groups[item.category] = [...(groups[item.category] ?? []), item];
    }
    return groups;
  }, [filtered]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]">
      {/* Backdrop. A button, not a div: a click target that cannot be reached
          from the keyboard leaves Escape as the only way out. */}
      <button
        type="button"
        aria-label="Close search"
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />

      {/* Dialog. A command palette is a modal surface, so it says so - which
          also gives tests and assistive technology something to scope to. */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Search"
        className="relative w-full max-w-lg mx-4 bg-card border border-border rounded-xl shadow-2xl overflow-hidden"
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search pages, tests, failures..."
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
          />
          <kbd className="hidden sm:inline-flex items-center text-[10px] text-muted-foreground bg-muted border border-border rounded px-1.5 py-0.5 font-mono">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto py-2">
          {filtered.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <Hash className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No results for &quot;{query}&quot;</p>
            </div>
          ) : (
            Object.entries(grouped).map(([category, items]) => (
              <div key={category}>
                <div className="px-4 py-1.5">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {category}
                  </span>
                </div>
                {items.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      router.push(item.href);
                      onClose();
                    }}
                    className="flex items-center gap-3 w-full px-4 py-2 text-left hover:bg-accent/50 transition-colors"
                  >
                    <div className="text-muted-foreground shrink-0">{item.icon}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.title}</p>
                      {item.subtitle && (
                        <p className="text-[11px] text-muted-foreground truncate">{item.subtitle}</p>
                      )}
                    </div>
                    <ArrowRight className="h-3 w-3 text-muted-foreground/50 shrink-0" />
                  </button>
                ))}
              </div>
            ))
          )}
        </div>

        {/* Footer hint */}
        <div className="px-4 py-2 border-t border-border flex items-center gap-4 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <kbd
              className="bg-muted border border-border rounded px-1 py-0.5 font-mon
o"
            >
              ↑↓
            </kbd>
            Navigate
          </span>
          <span className="flex items-center gap-1">
            <kbd className="bg-muted border border-border rounded px-1 py-0.5 font-mono">↵</kbd>
            Open
          </span>
          <span className="flex items-center gap-1">
            <kbd className="bg-muted border border-border rounded px-1 py-0.5 font-mono">ESC</kbd>
            Close
          </span>
        </div>
      </div>
    </div>
  );
}
