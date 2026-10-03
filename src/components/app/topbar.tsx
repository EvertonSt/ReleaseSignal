"use client";

import { useState, useEffect, useCallback } from "react";
import { Menu, Search } from "lucide-react";
import { useMobileNav } from "@/contexts/mobile-nav-context";
import { UserMenu } from "@/components/auth/user-menu";
import { NotificationDropdown } from "@/components/app/notification-dropdown";
import { CommandSearch } from "@/components/app/command-search";

export function TopBar() {
  const { toggle } = useMobileNav();
  const [searchOpen, setSearchOpen] = useState(false);

  const handleSearchOpen = useCallback(() => setSearchOpen(true), []);
  const handleSearchClose = useCallback(() => setSearchOpen(false), []);

  // Global ⌘K / Ctrl+K listener
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <>
      <CommandSearch open={searchOpen} onClose={handleSearchClose} />

      <header className="flex items-center h-12 px-4 border-b border-border bg-card/50 backdrop-blur-sm shrink-0">
        {/* Mobile hamburger */}
        <button
          onClick={toggle}
          className="lg:hidden p-1.5 -ml-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent/50 mr-3 transition-colors"
          aria-label="Open navigation menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Search trigger */}
        <button
          onClick={handleSearchOpen}
          className="flex items-center gap-2 flex-1 max-w-md px-3 py-1.5 rounded-lg bg-muted/50 border border-border text-muted-foreground text-sm hover:bg-muted/80 hover:border-muted-foreground/20 transition-all text-left"
        >
          <Search className="h-3.5 w-3.5 shrink-0" />
          <span className="hidden sm:inline">Search runs, failures, tests...</span>
          <span className="sm:hidden">Search...</span>
          <kbd className="hidden md:inline-flex ml-auto items-center text-[10px] bg-background border border-border rounded px-1.5 py-0.5 font-mono">
            <span className="mr-0.5">⌘</span>K
          </kbd>
        </button>

        <div className="flex items-center gap-1 ml-3">
          {/* Notification bell with dropdown */}
          <NotificationDropdown />

          {/* Separator */}
          <div className="w-px h-5 bg-border mx-1 hidden sm:block" />

          {/* User avatar dropdown */}
          <div className="hidden sm:block">
            <UserMenu />
          </div>
        </div>
      </header>
    </>
  );
}
