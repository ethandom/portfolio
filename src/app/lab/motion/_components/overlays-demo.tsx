"use client";

import { Kbd, SpecLabel } from "@/components/manual";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const DAYS = [
  { date: "Mon, Oct 6", count: 0 },
  { date: "Tue, Oct 7", count: 3 },
  { date: "Wed, Oct 8", count: 7 },
  { date: "Thu, Oct 9", count: 12 },
  { date: "Fri, Oct 10", count: 2 },
  { date: "Sat, Oct 11", count: 5 },
  { date: "Sun, Oct 12", count: 1 },
];

function level(count: number) {
  return count === 0 ? 0 : count < 3 ? 1 : count < 6 ? 2 : count < 10 ? 3 : 4;
}

function Row({ label, note, children }: { label: string; note: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-3 border-b border-hairline py-5 sm:grid-cols-[10rem_1fr] sm:items-start">
      <SpecLabel className="sm:pt-1.5">{label}</SpecLabel>
      <div className="grid gap-3">
        <div className="flex flex-wrap items-center gap-3">{children}</div>
        <p className="max-w-(--measure) text-sm text-ink-muted">{note}</p>
      </div>
    </div>
  );
}

export function OverlaysDemo() {
  return (
    <div className="border-t border-hairline">
      <Row
        label="Tooltip"
        note="The first tag tears out toward its cell in 160ms. Sliding along the row switches instantly, because a reader scanning values shouldn't wait for each one. It fades out in 80ms."
      >
        <ul className="flex gap-1" aria-label="Sample activity, Oct 6 to 12">
          {DAYS.map((day, i) => (
            <li key={day.date}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    aria-label={`${day.count} contributions, ${day.date}`}
                    className="block size-7 border border-hairline"
                    style={{
                      background: `color-mix(in oklab, var(--accent) ${level(day.count) * 25}%, var(--sunken))`,
                    }}
                  />
                </TooltipTrigger>
                <TooltipContent side={i % 2 ? "bottom" : "top"}>
                  <span className="text-ink-inverse">{day.count} contributions</span>
                  <span className="opacity-70"> · {day.date}</span>
                </TooltipContent>
              </Tooltip>
            </li>
          ))}
        </ul>
      </Row>

      <Row
        label="Dialog"
        note="The sheet feeds out of a slot: its top edge prints first and it travels down 8px over 240ms while the scrim fades in. It leaves faster than it came (160ms), dropping 4px as it fades."
      >
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline">Insert sheet</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Insert sheet · Motion specimen</DialogTitle>
            </DialogHeader>
            <DialogBody className="space-y-3">
              <DialogDescription className="text-base text-ink">
                Watch the ink frame: the title strip arrives before the footer, the way a
                printed sheet comes out of a feeder.
              </DialogDescription>
              <p className="max-w-(--measure) text-sm">
                Under reduced motion it becomes an 80ms cross-fade, so opening still reads
                as an event. Close it with <Kbd>Esc</Kbd>, the key in the corner, or the
                page behind it.
              </p>
            </DialogBody>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Close</Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </Row>
    </div>
  );
}
