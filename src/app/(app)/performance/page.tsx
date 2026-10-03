const metrics = [
  { date: "Aug 20", p50: 42000, p95: 89000, budget: 120000, withinBudget: true },
  { date: "Aug 21", p50: 41500, p95: 87000, budget: 120000, withinBudget: true },
  { date: "Aug 22", p50: 43000, p95: 92000, budget: 120000, withinBudget: true },
  { date: "Aug 23", p50: 44500, p95: 95000, budget: 120000, withinBudget: true },
  { date: "Aug 24", p50: 46000, p95: 102000, budget: 120000, withinBudget: true },
  { date: "Aug 25", p50: 48000, p95: 108000, budget: 120000, withinBudget: true },
  { date: "Aug 26", p50: 51000, p95: 115000, budget: 120000, withinBudget: true },
];

function fmt(ms: number) {
  return ms < 1000 ? ms + "ms" : (ms / 1000).toFixed(1) + "s";
}

export default function PerformancePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Performance Analysis</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Test duration trends and performance budget tracking
        </p>
      </div>
      <div className="grid sm:grid-cols-4 gap-4">
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs text-muted-foreground">p50 Duration</p>
          <p className="text-2xl font-bold mt-1">51.0s</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs text-muted-foreground">p95 Duration</p>
          <p className="text-2xl font-bold mt-1">115.0s</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs text-muted-foreground">Budget</p>
          <p className="text-2xl font-bold mt-1">120.0s</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs text-muted-foreground">Status</p>
          <p className="text-2xl font-bold mt-1 text-success">Within</p>
        </div>
      </div>
      <div className="rounded-lg border bg-card p-5">
        <h2 className="text-sm font-semibold mb-4">Duration Trend (Last 7 Days)</h2>
        <div className="space-y-2">
          {metrics.map((m) => (
            <div key={m.date} className="flex items-center gap-4">
              <span className="text-xs text-muted-foreground w-16">{m.date}</span>
              <div className="flex-1 relative h-6 bg-muted/50 rounded">
                <div
                  className="absolute left-0 top-0 h-full rounded bg-primary/30"
                  style={{ width: (m.p95 / m.budget) * 100 + "%" }}
                />
                <div
                  className="absolute left-0 top-0 h-full rounded bg-primary/60"
                  style={{ width: (m.p50 / m.budget) * 100 + "%" }}
                />
              </div>
              <span className="text-xs w-20 text-right">p50: {fmt(m.p50)}</span>
              <span className="text-xs w-20 text-right">p95: {fmt(m.p95)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
