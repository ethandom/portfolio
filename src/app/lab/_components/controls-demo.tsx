"use client";

import { useState } from "react";
import { ArrowUpRightIcon, DownloadSimpleIcon } from "@phosphor-icons/react";
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
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

type Source = "both" | "github" | "leetcode";

const DAYS = [
  { date: "Mon, Oct 6", count: 0 },
  { date: "Tue, Oct 7", count: 3 },
  { date: "Wed, Oct 8", count: 7 },
  { date: "Thu, Oct 9", count: 12 },
  { date: "Fri, Oct 10", count: 2 },
];

function level(count: number) {
  return count === 0 ? 0 : count < 3 ? 1 : count < 6 ? 2 : count < 10 ? 3 : 4;
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-3 border-b border-hairline py-5 sm:grid-cols-[10rem_1fr] sm:items-center">
      <SpecLabel>{label}</SpecLabel>
      <div className="flex flex-wrap items-center gap-3">{children}</div>
    </div>
  );
}

export function ControlsDemo({ github, email }: { github: string; email: string }) {
  const [mode, setMode] = useState("manual");
  const [source, setSource] = useState<Source>("both");

  return (
    <div className="border-t border-hairline">
      <Row label="Button">
        <Button size="lg">
          <DownloadSimpleIcon weight="light" />
          Resume
        </Button>
        <Button variant="outline" size="lg" asChild>
          <a href={github} target="_blank" rel="noreferrer">
            GitHub
            <ArrowUpRightIcon weight="light" />
          </a>
        </Button>
        <Button variant="ghost" size="lg" asChild>
          <a href={`mailto:${email}`}>Email</a>
        </Button>
        <Button variant="link" asChild>
          <a href="#">Read the case study</a>
        </Button>
        <Button variant="outline" size="sm" disabled>
          Disabled
        </Button>
      </Row>

      <Row label="Toggle group">
        <ToggleGroup
          type="single"
          value={mode}
          onValueChange={(v) => v && setMode(v)}
          aria-label="View"
        >
          <ToggleGroupItem value="manual">Manual</ToggleGroupItem>
          <ToggleGroupItem value="workbench">Workbench</ToggleGroupItem>
        </ToggleGroup>
        <ToggleGroup
          type="single"
          size="sm"
          value={source}
          onValueChange={(v) => v && setSource(v as Source)}
          aria-label="Activity source"
        >
          <ToggleGroupItem value="both">Both</ToggleGroupItem>
          <ToggleGroupItem value="github">GitHub</ToggleGroupItem>
          <ToggleGroupItem value="leetcode">LeetCode</ToggleGroupItem>
        </ToggleGroup>
      </Row>

      <Row label="Tooltip">
        <ul className="flex gap-1" aria-label="Sample activity, Oct 6 to 10">
          {DAYS.map((day) => (
            <li key={day.date}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    aria-label={`${day.count} contributions, ${day.date}`}
                    className="block size-6 border border-hairline"
                    style={{
                      background: `color-mix(in oklab, var(--accent) ${level(day.count) * 25}%, var(--sunken))`,
                    }}
                  />
                </TooltipTrigger>
                <TooltipContent>
                  <span className="text-ink-inverse">{day.count} contributions</span>
                  <span className="opacity-70"> · {day.date}</span>
                </TooltipContent>
              </Tooltip>
            </li>
          ))}
        </ul>
        <span className="text-sm text-ink-muted">Hover or tab through the cells.</span>
      </Row>

      <Row label="Dialog">
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline">Open sheet</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Insert sheet · Specimen</DialogTitle>
            </DialogHeader>
            <DialogBody className="space-y-3">
              <DialogDescription className="text-base text-ink">
                A dialog is an inserted sheet: an ink frame, a title strip with the close
                key, a scrolling body and a footer for actions.
              </DialogDescription>
              <p className="max-w-(--measure) text-sm">
                Focus is trapped while it is open. Close it with the key in the corner,
                the button below, a click on the page behind it or <Kbd>Esc</Kbd>.
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

      <Row label="Kbd">
        <span className="flex items-center gap-1">
          <Kbd>Esc</Kbd>
          <Kbd>Tab</Kbd>
          <Kbd>←</Kbd>
          <Kbd>→</Kbd>
        </span>
      </Row>
    </div>
  );
}
