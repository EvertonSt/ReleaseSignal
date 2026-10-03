"use client";
import Link from "next/link";
import { useState } from "react";
import { Menu, X } from "lucide-react";

export function MarketingHeader() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const navItems = [
    { label: "Features", href: "#capabilities" },
    { label: "How it Works", href: "#workflow" },
    { label: "Pricing", href: "#pricing" },
    { label: "About", href: "#about" },
  ];
  return (
    <header className="fixed top-0 z-50 w-full border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm">
            RS
          </div>
          <span className="text-lg font-semibold">ReleaseSignal</span>
        </div>
        <nav className="hidden md:flex items-center gap-8">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="hidden sm:inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Explore Demo
          </Link>
          <button
            type="button"
            onClick={() => setMobileOpen((open) => !open)}
            // Icon-only controls need a name, and the name has to change with
            // the state or a screen reader user cannot tell which way the
            // toggle currently points.
            aria-label={mobileOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={mobileOpen}
            aria-controls="marketing-mobile-nav"
            className="md:hidden p-2 rounded-md hover:bg-accent"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>
      {mobileOpen && (
        <div
          id="marketing-mobile-nav"
          className="md:hidden border-t border-border bg-background p-4 space-y-3"
        >
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className="block text-sm text-muted-foreground hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
          <Link
            href="/dashboard"
            className="block rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground text-center"
          >
            Explore Demo
          </Link>
        </div>
      )}
    </header>
  );
}
