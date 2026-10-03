import { StatusBadge } from "@/components/shared/status-badge";
import { FileText } from "lucide-react";

const reports = [
  {
    id: "1",
    title: "Weekly Quality Report - Aug 18-24, 2025",
    type: "weekly",
    date: new Date("2025-08-24"),
    status: "generated",
  },
  {
    id: "2",
    title: "Release Report v2.4.0",
    type: "release",
    date: new Date("2025-08-23"),
    status: "generated",
  },
  {
    id: "3",
    title: "PR #142 Quality Report",
    type: "pull_request",
    date: new Date("2025-08-22"),
    status: "generated",
  },
  {
    id: "4",
    title: "Flaky Test Report - August 2025",
    type: "flaky",
    date: new Date("2025-08-21"),
    status: "generated",
  },
  {
    id: "5",
    title: "Regression Report - Auth Module",
    type: "regression",
    date: new Date("2025-08-20"),
    status: "generated",
  },
];

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Reports</h1>
        <p className="text-sm text-muted-foreground mt-1">Generated quality reports and shareable links</p>
      </div>
      <div className="space-y-3">
        {reports.map((r) => (
          <div key={r.id} className="rounded-lg border bg-card p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-medium">{r.title}</p>
                <p className="text-xs text-muted-foreground">
                  {r.type} | {r.date.toLocaleDateString()}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge variant="success" label={r.status} size="xs" />
              <button className="text-xs text-primary hover:underline">Share</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
