"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ListChecks,
  AlertTriangle,
  Bug,
  Shield,
  GitPullRequest,
  Activity,
  FileText,
  Settings,
  Home,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { useMobileNav } from "@/contexts/mobile-nav-context";
import { UserMenu } from "@/components/auth/user-menu";

const navigation = [
  { name: "Home", href: "/", icon: Home },
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Test Runs", href: "/test-runs", icon: ListChecks },
  { name: "Failures", href: "/failures", icon: AlertTriangle, badge: "5" },
  { name: "Flaky Tests", href: "/flaky-tests", icon: Bug, badge: "10" },
  { name: "Quality Gates", href: "/quality-gates", icon: Shield },
  { name: "Pull Requests", href: "/pull-requests", icon: GitPullRequest },
  { name: "Performance", href: "/performance", icon: Activity },
  { name: "Reports", href: "/reports", icon: FileText },
  { name: "Settings", href: "/settings", icon: Settings },
];

function SidebarLogo({ collapsed }: { collapsed: boolean }) {
  return collapsed ? (
    <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center mx-auto">
      <span className="text-xs font-bold text-primary-foreground">RS</span>
    </div>
  ) : (
    <div className="flex items-center gap-2">
      <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
        <span className="text-xs font-bold text-primary-foreground">RS</span>
      </div>
      <span className="font-semibold text-sm">ReleaseSignal</span>
    </div>
  );
}

function SidebarNav({ collapsed, onNavigate }: { collapsed: boolean; onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="flex-1 p-2 space-y-1">
      {navigation.map((item) => {
        const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
        return (
          <Link
            key={item.name}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
              isActive
                ? "bg-sidebar-accent text-foreground"
                : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-foreground",
              collapsed && "justify-center px-2"
            )}
            title={collapsed ? item.name : undefined}
          >
            <item.icon className="h-4 w-4 shrink-0" />
            {!collapsed && (
              <>
                <span className="flex-1">{item.name}</span>
                {item.badge && (
                  <span className="text-[10px] font-medium bg-primary/20 text-primary px-1.5 py-0.5 rounded-full">
                    {item.badge}
                  </span>
                )}
              </>
            )}
          </Link>
        );
      })}
    </nav>
  );
}

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const { open, setOpen } = useMobileNav();

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) setOpen(false);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [setOpen]);

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "hidden lg:flex flex-col border-r border-border bg-sidebar h-full transition-all duration-200 shrink-0",
          collapsed ? "w-16" : "w-60"
        )}
      >
        <div className="flex items-center h-14 px-4 border-b border-sidebar-border">
          <SidebarLogo collapsed={collapsed} />
        </div>
        <SidebarNav collapsed={collapsed} />
        <div className="p-2 border-t border-sidebar-border">
          <div className={cn("px-2 py-1", collapsed && "hidden")}>
            <UserMenu compact />
          </div>
          <button
            type="button"
            onClick={() => setCollapsed((value) => !value)}
            // Icon-only controls still need a name, and the label has to track
            // the action the button will perform, not the current state.
            aria-label={collapsed ? "Expand navigation" : "Collapse navigation"}
            aria-expanded={!collapsed}
            className="flex items-center justify-center w-full p-2 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent/50"
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>
      </aside>

      {/* Mobile drawer overlay */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close navigation"
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 w-64 bg-sidebar border-r border-border flex flex-col animate-in">
            <div className="flex items-center justify-between h-14 px-4 border-b border-sidebar-border">
              <SidebarLogo collapsed={false} />
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close navigation menu"
                className="p-1 rounded-md text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <SidebarNav collapsed={false} onNavigate={() => setOpen(false)} />
            <div className="p-2 border-t border-sidebar-border">
              <UserMenu compact />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
