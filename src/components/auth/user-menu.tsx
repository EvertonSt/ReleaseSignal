"use client";

import { useSession, signOut } from "next-auth/react";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import {
  LogOut,
  User,
  Settings,
  ExternalLink,
  Moon,
  Keyboard,
  ChevronDown,
  Building2,
  CreditCard,
  HelpCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface UserMenuProps {
  compact?: boolean;
}

export function UserMenu({ compact }: UserMenuProps) {
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const user = session?.user;
  const name = user?.name || "Demo User";
  const email = user?.email || "demo@releasesignal.dev";
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "flex items-center gap-2 rounded-lg transition-colors hover:bg-accent/50",
          compact ? "p-1.5" : "p-1.5 pl-1"
        )}
      >
        <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center">
          <span className="text-[10px] font-bold text-primary">{initials}</span>
        </div>
        {!compact && (
          <div className="hidden md:flex items-center gap-1 text-left">
            <div className="text-xs font-medium leading-none">{name}</div>
            <ChevronDown className="h-3 w-3 text-muted-foreground" />
          </div>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-72 bg-popover border border-border rounded-xl shadow-2xl z-50 overflow-hidden">
          {/* User info header */}
          <div className="px-4 py-3 border-b border-border bg-muted/30">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center">
                <span className="text-xs font-bold text-primary">{initials}</span>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate">{name}</p>
                <p className="text-[11px] text-muted-foreground truncate">{email}</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 mt-2.5">
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground bg-background border border-border rounded px-2 py-0.5">
                <Building2 className="h-2.5 w-2.5" />
                Acme Engineering
              </div>
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground bg-background border border-border rounded px-2 py-0.5">
                <CreditCard className="h-2.5 w-2.5" />
                Pro
              </div>
            </div>
          </div>

          {/* Menu items */}
          <div className="py-1.5">
            <Link
              href="/settings"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 w-full px-4 py-2 text-sm text-foreground hover:bg-accent/50 transition-colors"
            >
              <User className="h-3.5 w-3.5 text-muted-foreground" />
              Profile & Account
            </Link>
            <Link
              href="/settings"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 w-full px-4 py-2 text-sm text-foreground hover:bg-accent/50 transition-colors"
            >
              <Settings className="h-3.5 w-3.5 text-muted-foreground" />
              Settings
            </Link>
            <button
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 w-full px-4 py-2 text-sm text-foreground hover:bg-accent/50 transition-colors"
            >
              <Keyboard className="h-3.5 w-3.5 text-muted-foreground" />
              Keyboard shortcuts
              <kbd className="ml-auto text-[10px] text-muted-foreground bg-muted border border-border rounded px-1 py-0.5 font-mono">
                ⌘K
              </kbd>
            </button>
            <button
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 w-full px-4 py-2 text-sm text-foreground hover:bg-accent/50 transition-colors"
            >
              <Moon className="h-3.5 w-3.5 text-muted-foreground" />
              Appearance
              <span className="ml-auto text-[10px] text-muted-foreground">Dark</span>
            </button>
          </div>

          {/* Links */}
          <div className="border-t border-border py-1.5">
            <a
              href="https://github.com/EvertonSt"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2.5 w-full px-4 py-2 text-sm text-foreground hover:bg-accent/50 transition-colors"
            >
              <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
              GitHub
            </a>
            <button
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 w-full px-4 py-2 text-sm text-foreground hover:bg-accent/50 transition-colors"
            >
              <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
              Help & Support
            </button>
          </div>

          {/* Sign out */}
          <div className="border-t border-border py-1.5">
            <button
              onClick={() => {
                void signOut({ callbackUrl: "/" });
              }}
              className="flex items-center gap-2.5 w-full px-4 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
