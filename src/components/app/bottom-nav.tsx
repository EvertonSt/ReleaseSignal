"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, ListChecks, AlertTriangle, Shield, Activity } from "lucide-react";
import { cn } from "@/lib/utils";

const bottomNavItems = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Runs", href: "/test-runs", icon: ListChecks },
  { name: "Issues", href: "/failures", icon: AlertTriangle, badge: "5" },
  { name: "Gates", href: "/quality-gates", icon: Shield },
  { name: "Perf", href: "/performance", icon: Activity },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 lg:hidden bg-card border-t border-border safe-area-bottom">
      <div className="flex items-center justify-around h-14">
        {bottomNavItems.map((item) => {
          const isActive =
            pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg transition-colors min-w-[48px]",
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <div className="relative">
                <item.icon className="h-5 w-5" />
                {item.badge && (
                  <span className="absolute -top-1 -right-2 text-[9px] font-bold bg-destructive text-destructive-foreground min-w-[14px] h-[14px] rounded-full flex items-center justify-center px-0.5">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-medium leading-none">{item.name}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
