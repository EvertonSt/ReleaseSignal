"use client";

import { MetricCard } from "@/components/shared/metric-card";
import { StatusBadge, GateStatusBadge } from "@/components/shared/status-badge";
import { demoTestRuns, demoFlakyTests } from "@/lib/demo/data";
import { demoFailureClusters } from "@/lib/demo/data/failures";
import { demoQualityGates } from "@/lib/demo/data/quality-gates";
import { BarChart3, TrendingUp, Bug, Shield, Clock, AlertTriangle, CheckCircle2, Zap } from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
  ReferenceLine,
} from "recharts";

const passRateHistory = [
  { date: "Aug 1", rate: 96.2, runs: 4 },
  { date: "Aug 3", rate: 95.8, runs: 3 },
  { date: "Aug 5", rate: 97.1, runs: 5 },
  { date: "Aug 7", rate: 93.4, runs: 4 },
  { date: "Aug 9", rate: 94.9, runs: 6 },
  { date: "Aug 11", rate: 96.7, runs: 3 },
  { date: "Aug 13", rate: 97.3, runs: 4 },
  { date: "Aug 15", rate: 95.1, runs: 5 },
  { date: "Aug 17", rate: 96.8, runs: 4 },
  { date: "Aug 19", rate: 94.2, runs: 6 },
  { date: "Aug 21", rate: 97.5, runs: 3 },
  { date: "Aug 23", rate: 96.1, runs: 4 },
];

const testDurationHistory = [
  { date: "Aug 1", p50: 42, p95: 89, budget: 120 },
  { date: "Aug 3", p50: 44, p95: 92, budget: 120 },
  { date: "Aug 5", p50: 41, p95: 85, budget: 120 },
  { date: "Aug 7", p50: 58, p95: 124, budget: 120 },
  { date: "Aug 9", p50: 48, p95: 98, budget: 120 },
  { date: "Aug 11", p50: 43, p95: 87, budget: 120 },
  { date: "Aug 13", p50: 40, p95: 82, budget: 120 },
  { date: "Aug 15", p50: 45, p95: 94, budget: 120 },
  { date: "Aug 17", p50: 42, p95: 88, budget: 120 },
  { date: "Aug 19", p50: 46, p95: 96, budget: 120 },
  { date: "Aug 21", p50: 41, p95: 84, budget: 120 },
  { date: "Aug 23", p50: 39, p95: 81, budget: 120 },
];

const failureBreakdown = [
  { name: "Regressions", value: 3, color: "#ef4444" },
  { name: "Flaky", value: 5, color: "#f59e0b" },
  { name: "Environment", value: 2, color: "#3b82f6" },
  { name: "Test Defects", value: 1, color: "#71717a" },
];

const testVolumeByRepo = [
  { repo: "acme-web", passed: 1180, failed: 12, flaky: 8 },
  { repo: "acme-api", passed: 320, failed: 5, flaky: 3 },
  { repo: "acme-mobile", passed: 185, failed: 8, flaky: 4 },
  { repo: "acme-design", passed: 260, failed: 2, flaky: 6 },
];

const ts = {
  backgroundColor: "var(--card)",
  border: "1px solid var(--border)",
  borderRadius: "8px",
  fontSize: "12px",
};

/**
 * Recharts injects the series bag into a custom tooltip at runtime and types it
 * as `any`, which pushes every mistake in here downstream to a blank box in the
 * browser. Declaring the subset this dashboard actually reads means a renamed
 * data key fails at compile time instead.
 */
interface TooltipEntry {
  dataKey?: string | number;
  value?: number | string;
  color?: string;
  fill?: string;
  payload?: Record<string, number | string>;
}

interface ChartTooltipProps {
  active?: boolean;
  payload?: readonly TooltipEntry[];
  label?: string | number;
}

function PassRateTooltip({ active, payload, label }: ChartTooltipProps) {
  const first = payload?.[0];
  if (!active || !first) return null;
  const runs = first.payload?.runs;
  return (
    <div style={ts} className="p-3 shadow-lg">
      <p className="font-medium text-xs mb-1">{label}</p>
      <p className="text-xs text-primary">
        Pass Rate: <span className="font-bold">{first.value}%</span>
      </p>
      {runs !== undefined && <p className="text-xs text-muted-foreground mt-0.5">{String(runs)} runs</p>}
    </div>
  );
}

function DurationTooltip({ active, payload, label }: ChartTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div style={ts} className="p-3 shadow-lg">
      <p className="font-medium text-xs mb-1">{label}</p>
      {payload.map((entry) => (
        <p key={String(entry.dataKey)} className="text-xs" style={{ color: entry.color }}>
          {String(entry.dataKey).toUpperCase()}: <span className="font-bold">{entry.value}s</span>
        </p>
      ))}
    </div>
  );
}

function VolumeTooltip({ active, payload, label }: ChartTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div style={ts} className="p-3 shadow-lg">
      <p className="font-medium text-xs mb-1">{label}</p>
      {payload.map((entry) => (
        <p key={String(entry.dataKey)} className="text-xs" style={{ color: entry.fill ?? entry.color }}>
          {entry.dataKey}: <span className="font-bold">{entry.value}</span>
        </p>
      ))}
    </div>
  );
}

export default function DashboardPage() {
  const recent = demoTestRuns.slice(0, 5);
  const unstableTests = demoFlakyTests.filter((t) => t.status === "active").slice(0, 5);
  const pendingFailures = demoFailureClusters.filter((f) => f.triageStatus === "pending");

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Release Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Acme Engineering &middot; Last updated 5 minutes ago
          </p>
        </div>
        <GateStatusBadge decision="pass" />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Release Health"
          value="94.2%"
          change={2.1}
          changeLabel="vs last week"
          icon={<BarChart3 className="h-4 w-4" />}
        />
        <MetricCard
          label="Pass Rate"
          value="94.2%"
          change={1.3}
          icon={<CheckCircle2 className="h-4 w-4" />}
        />
        <MetricCard
          label="Failure Rate"
          value="3.1%"
          change={-0.8}
          changeLabel="3 active regressions"
          icon={<AlertTriangle className="h-4 w-4" />}
        />
        <MetricCard
          label="Flaky Rate"
          value="2.7%"
          change={0.5}
          changeLabel="8 flaky tests detected"
          icon={<Bug className="h-4 w-4" />}
        />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Open Regressions" value={3} icon={<TrendingUp className="h-4 w-4" />} />
        <MetricCard label="Avg Duration" value="1m 47s" change={-5.2} icon={<Clock className="h-4 w-4" />} />
        <MetricCard label="Performance Risk" value="Low" icon={<Zap className="h-4 w-4" />} />
        <MetricCard
          label="Tests in PR"
          value={47}
          changeLabel="2 new failures"
          icon={<Shield className="h-4 w-4" />}
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="rounded-xl border bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold">Pass Rate Trend</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">Last 12 days across all repositories</p>
            </div>
            <span className="text-xs font-medium text-success">&uarr; 1.3%</span>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={passRateHistory}>
              <defs>
                <linearGradient id="prg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                domain={[90, 100]}
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                axisLine={false}
                tickLine={false}
                unit="%"
              />
              <Tooltip content={<PassRateTooltip />} />
              <ReferenceLine y={95} stroke="#ef4444" strokeDasharray="4 4" strokeWidth={1} />
              <Area
                type="monotone"
                dataKey="rate"
                stroke="#6366f1"
                fill="url(#prg)"
                strokeWidth={2.5}
                dot={{ r: 3, fill: "#6366f1", strokeWidth: 0 }}
                activeDot={{ r: 5, stroke: "#6366f1", strokeWidth: 2, fill: "#fff" }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="rounded-xl border bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold">Test Duration Trend</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">p50 and p95 against 120s budget</p>
            </div>
            <span className="text-xs font-medium text-success">&darr; 12s avg</span>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={testDurationHistory}>
              <defs>
                <linearGradient id="p50g" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="p95g" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.1} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                axisLine={false}
                tickLine={false}
                unit="s"
              />
              <Tooltip content={<DurationTooltip />} />
              <Legend
                verticalAlign="top"
                height={24}
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: "11px" }}
              />
              <ReferenceLine y={120} stroke="#ef4444" strokeDasharray="4 4" strokeWidth={1} />
              <Area
                type="monotone"
                dataKey="p95"
                stroke="#f59e0b"
                fill="url(#p95g)"
                strokeWidth={2}
                dot={false}
                name="p95"
              />
              <Area
                type="monotone"
                dataKey="p50"
                stroke="#22c55e"
                fill="url(#p50g)"
                strokeWidth={2}
                dot={false}
                name="p50"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="rounded-xl border bg-card p-5">
          <h3 className="text-sm font-semibold mb-1">Failure Breakdown</h3>
          <p className="text-[11px] text-muted-foreground mb-4">By classification type</p>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={failureBreakdown}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={3}
                strokeWidth={0}
              >
                {failureBreakdown.map((entry, index) => (
                  <Cell key={"c" + index} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip contentStyle={ts} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-3 mt-2 justify-center">
            {failureBreakdown.map((f) => (
              <div key={f.name} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: f.color }} />
                {f.name} ({f.value})
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-xl border bg-card p-5">
          <h3 className="text-sm font-semibold mb-1">Test Volume by Repository</h3>
          <p className="text-[11px] text-muted-foreground mb-4">Passed, failed, and flaky</p>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={testVolumeByRepo} layout="vertical" barGap={0}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
              <XAxis
                type="number"
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                type="category"
                dataKey="repo"
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                axisLine={false}
                tickLine={false}
                width={90}
              />
              <Tooltip content={<VolumeTooltip />} />
              <Legend
                verticalAlign="top"
                height={24}
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: "11px" }}
              />
              <Bar dataKey="passed" stackId="a" fill="#22c55e" name="Passed" />
              <Bar dataKey="failed" stackId="a" fill="#ef4444" name="Failed" />
              <Bar dataKey="flaky" stackId="a" fill="#f59e0b" radius={[0, 4, 4, 0]} name="Flaky" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="rounded-xl border bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold">Quality Gates</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">Evaluation status</p>
            </div>
            <a href="/quality-gates" className="text-xs text-primary hover:underline">
              Configure
            </a>
          </div>
          <div className="space-y-3">
            {demoQualityGates.map((gate) => (
              <div key={gate.id} className="rounded-lg bg-muted/50 p-3">
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-sm font-medium truncate">{gate.name}</p>
                  <GateStatusBadge decision={gate.lastDecision || "pending"} size="xs" />
                </div>
                <p className="text-[11px] text-muted-foreground line-clamp-1">{gate.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="rounded-xl border bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold">Recent Releases</h3>
            <a href="/test-runs" className="text-xs text-primary hover:underline">
              View all
            </a>
          </div>
          <div className="space-y-3">
            {recent.map((run) => (
              <div
                key={run.id}
                className="flex items-center justify-between py-2 border-b border-border last:border-0"
              >
                <div className="flex items-center gap-3">
                  <StatusBadge status={run.status} size="xs" />
                  <div>
                    <p className="text-sm font-medium">{run.repository.name}</p>
                    <p className="text-xs text-muted-foreground">{run.branch}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">{run.totalTests} tests</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-xl border bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold">Most Unstable Tests</h3>
            <a href="/flaky-tests" className="text-xs text-primary hover:underline">
              View all
            </a>
          </div>
          <div className="space-y-3">
            {unstableTests.map((flake) => (
              <div
                key={flake.id}
                className="flex items-center justify-between py-2 border-b border-border last:border-0"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{flake.title}</p>
                  <p className="text-xs text-muted-foreground">{flake.repository}</p>
                </div>
                <span className="text-sm font-bold text-warning shrink-0 ml-3">
                  {(flake.flakeRate * 100).toFixed(0)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-xl border bg-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold">Active Failure Clusters</h3>
          <a href="/failures" className="text-xs text-primary hover:underline">
            View all
          </a>
        </div>
        <div className="space-y-3">
          {pendingFailures.map((fc) => (
            <div key={fc.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <StatusBadge status={fc.severity} size="xs" />
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{fc.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{fc.errorMessage}</p>
                </div>
              </div>
              <StatusBadge status={fc.classification} size="xs" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
