"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  Check,
  CheckCheck,
  AlertTriangle,
  Bug,
  Shield,
  GitPullRequest,
  Activity,
  Settings,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { demoNotifications, type Notification } from "@/lib/demo/data/notifications";

const typeConfig: Record<Notification["type"], { icon: React.ReactNode; color: string }> = {
  regression: { icon: <AlertTriangle className="h-3.5 w-3.5" />, color: "text-destructive" },
  failure: { icon: <AlertTriangle className="h-3.5 w-3.5" />, color: "text-destructive" },
  flaky: { icon: <Bug className="h-3.5 w-3.5" />, color: "text-warning" },
  gate: { icon: <Shield className="h-3.5 w-3.5" />, color: "text-warning" },
  release: { icon: <Activity className="h-3.5 w-3.5" />, color: "text-success" },
  pr: { icon: <GitPullRequest className="h-3.5 w-3.5" />, color: "text-info" },
  system: { icon: <Zap className="h-3.5 w-3.5" />, color: "text-muted-foreground" },
};

function getRelativeTime(date: Date): string {
  const diff = Date.now() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function NotificationDropdown() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState(demoNotifications);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const unreadCount = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const toggleRead = (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: !n.read } : n)));
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="relative p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
        aria-label="Notifications"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 flex items-center justify-center text-[9px] font-bold bg-destructive text-destructive-foreground rounded-full px-1">
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-96 max-w-[calc(100vw-2rem)] bg-popover border border-border rounded-xl shadow-2xl z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold">Notifications</h3>
              {unreadCount > 0 && (
                <span className="text-[10px] font-medium bg-primary/20 text-primary px-1.5 py-0.5 rounded-full">
                  {unreadCount} new
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
              >
                <CheckCheck className="h-3 w-3" />
                Mark all read
              </button>
            )}
          </div>

          {/* Notification list */}
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="py-12 text-center">
                <Bell className="h-8 w-8 text-muted-foreground/20 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No notifications</p>
              </div>
            ) : (
              notifications.map((n) => {
                const config = typeConfig[n.type];
                return (
                  /*
                   * Two sibling buttons rather than a clickable row with a
                   * button inside it. Nesting interactive elements is invalid
                   * HTML and breaks keyboard traversal; splitting them keeps
                   * "open this notification" and "toggle read" independently
                   * reachable.
                   */
                  <div
                    key={n.id}
                    className={cn(
                      "flex items-start px-4 py-3 border-b border-border/50 last:border-0 transition-colors hover:bg-accent/30",
                      !n.read && "bg-primary/5"
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        if (n.actionUrl) router.push(n.actionUrl);
                        toggleRead(n.id);
                        setOpen(false);
                      }}
                      className="flex items-start gap-3 flex-1 min-w-0 text-left cursor-pointer"
                    >
                      <span className={cn("mt-0.5 shrink-0", config.color)}>{config.icon}</span>
                      <span className="flex-1 min-w-0 block">
                        <span className="flex items-center gap-2">
                          <span className={cn("text-sm font-medium truncate", !n.read && "text-foreground")}>
                            {n.title}
                          </span>
                          {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />}
                        </span>
                        <span className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2 block">
                          {n.message}
                        </span>
                        <span className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] text-muted-foreground">
                            {getRelativeTime(n.timestamp)}
                          </span>
                          {n.repository && (
                            <>
                              <span className="text-muted-foreground/30">·</span>
                              <span className="text-[10px] text-muted-foreground">{n.repository}</span>
                            </>
                          )}
                        </span>
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleRead(n.id)}
                      aria-label={n.read ? `Mark "${n.title}" as unread` : `Mark "${n.title}" as read`}
                      className="shrink-0 ml-2 p-1 rounded text-muted-foreground/50 hover:text-foreground hover:bg-accent/50 transition-colors"
                      title={n.read ? "Mark as unread" : "Mark as read"}
                    >
                      {n.read ? <Check className="h-3 w-3" /> : <Bell className="h-3 w-3" />}
                    </button>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2.5 border-t border-border">
            <button
              onClick={() => {
                router.push("/settings");
                setOpen(false);
              }}
              className="flex items-center justify-center gap-1.5 w-full text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <Settings className="h-3 w-3" />
              Notification settings
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
