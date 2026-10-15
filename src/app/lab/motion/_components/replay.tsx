"use client";

import { useState, type ReactNode } from "react";
import { ArrowCounterClockwiseIcon } from "@phosphor-icons/react";
import { TriggerOverride } from "@/components/motion";
import { Button } from "@/components/ui/button";

/**
 * Lab-only: remounts its children so their entrances run again.
 * The first pass plays as on the real page (on scroll); replays play on mount.
 */
export function Replay({ caption, children }: { caption?: ReactNode; children: ReactNode }) {
  const [run, setRun] = useState(0);

  return (
    <div className="grid grid-cols-1 gap-3">
      <TriggerOverride key={run} value={run > 0 ? "mount" : null}>
        {children}
      </TriggerOverride>
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
        {caption ? <p className="max-w-(--measure) text-sm text-ink-muted">{caption}</p> : <span />}
        <Button variant="outline" size="sm" onClick={() => setRun((n) => n + 1)}>
          <ArrowCounterClockwiseIcon weight="light" />
          Replay
        </Button>
      </div>
    </div>
  );
}
