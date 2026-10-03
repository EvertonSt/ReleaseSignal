import { Settings, Users, Shield, Bell, Key, Database, Palette } from "lucide-react";

const sections = [
  {
    icon: Settings,
    title: "Organization Profile",
    desc: "Manage your organization name, slug, and general settings",
  },
  { icon: Users, title: "Team Members", desc: "Invite and manage team members with role-based access" },
  { icon: Shield, title: "Roles and Permissions", desc: "Configure role definitions and permission scopes" },
  { icon: Key, title: "API Keys", desc: "Manage API keys for CI ingestion and external integrations" },
  {
    icon: Bell,
    title: "Notifications",
    desc: "Configure email, Slack, and webhook notification preferences",
  },
  { icon: Palette, title: "Branding", desc: "Customize organization logo, colors, and white-label options" },
  { icon: Database, title: "Data Management", desc: "Export, retain, or delete organization data" },
];

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Configure your organization and integrations</p>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        {sections.map((s) => (
          <div
            key={s.title}
            className="rounded-lg border bg-card p-5 hover:bg-accent/30 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-3 mb-2">
              <s.icon className="h-5 w-5 text-primary" />
              <h3 className="font-medium text-sm">{s.title}</h3>
            </div>
            <p className="text-xs text-muted-foreground">{s.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
