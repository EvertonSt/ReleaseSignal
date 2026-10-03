"use client";

import { AlertTriangle } from "lucide-react";

export function DemoBanner() {
  return (
    <div
      className="sticky top-0 z-[60] bg-warning/10 border-b border-warning/20 px-4 py-1.5 text-center shrink-0"
      role="status"
      aria-label="Demo mode active"
    >
      <p className="text-xs font-medium text-warning">
        <AlertTriangle className="inline h-3 w-3 mr-1 -mt-0.5" />
        Demo mode — synthetic test data; production integrations are not enabled.
      </p>
    </div>
  );
}
