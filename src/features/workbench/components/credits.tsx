"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ArrowUpRightIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import type { Credit } from "@/lib/content";

/** In `next dev` Next's badge holds the corner (20–56px); production has none. */
const DEV_BADGE = process.env.NODE_ENV === "development";

/**
 * Bottom left, over the scene: a Credits key that opens the list of
 * third-party work in the room, and beside it the one credit that stays on
 * screen (the city view's map data: OpenStreetMap asks for its credit where
 * the map shows, without a click). The route renders it beside the
 * Workbench, like the view switch, and it shows where that does (`dock:`,
 * the screens that get the scene). The strip keeps left of the switch; where
 * it's too narrow, the on-screen credit wraps above the key.
 *
 * A disclosure, not a dialog: the key toggles the list, and Esc or a press
 * anywhere else closes it.
 */
export function Credits({ credits }: { credits: Credit[] }) {
  const [open, setOpen] = useState(false);
  const listId = useId();
  const root = useRef<HTMLDivElement>(null);
  const key = useRef<HTMLButtonElement>(null);
  const pinned = credits.find((c) => c.onScreen);

  useEffect(() => {
    if (!open) return;
    // Capture, on the window: Esc closes the list before the app's own Esc
    // (close the panel, leave the station) or the terminal sees it.
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.isComposing) return;
      e.stopPropagation();
      setOpen(false);
      const at = document.activeElement;
      if (!at || at === document.body || root.current?.contains(at)) {
        key.current?.focus();
      }
    };
    const onPress = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("keydown", onKey, true);
    window.addEventListener("pointerdown", onPress, true);
    return () => {
      window.removeEventListener("keydown", onKey, true);
      window.removeEventListener("pointerdown", onPress, true);
    };
  }, [open]);

  if (!credits.length) return null;

  return (
    // The station panel's layer, after it: an open list lies over a left panel.
    <div
      ref={root}
      className={cn(
        "fixed bottom-4 z-(--z-overlay) hidden flex-col items-start gap-4 dock:flex",
        DEV_BADGE ? "left-18" : "left-4",
      )}
    >
      <section
        id={listId}
        aria-label="Credits"
        hidden={!open}
        className="w-[min(24rem,calc(100vw-2rem))] border border-strong bg-bg/85 backdrop-blur-md"
      >
        <dl className="divide-y divide-hairline">
          {credits.map((credit) => (
            <div key={credit.subject} className="grid gap-1 px-3 py-2.5">
              <dt className="font-mono text-label text-ink-muted uppercase">
                {credit.subject}
              </dt>
              <dd className="text-sm text-ink">
                {credit.href ? (
                  <a
                    href={credit.href}
                    target="_blank"
                    rel="noreferrer"
                    className="underline decoration-rule decoration-1 underline-offset-4 transition-colors duration-(--dur-fast) ease-out hover:decoration-ink"
                  >
                    {credit.notice}
                    {/* Inline, so a wrapped notice keeps it after its last word. */}
                    <ArrowUpRightIcon
                      weight="light"
                      className="ml-1 inline size-3.5 align-[-0.125em]"
                    />
                  </a>
                ) : (
                  credit.notice
                )}
                {credit.license && (
                  <span className="text-ink-muted"> · {credit.license}</span>
                )}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      {/* Half the switch, the left inset and a gap: 8.5rem (11.5rem past the badge). */}
      <div
        className={cn(
          "flex flex-wrap-reverse items-center gap-x-3 gap-y-1.5",
          DEV_BADGE
            ? "max-w-[calc(50vw-11.5rem)]"
            : "max-w-[calc(50vw-8.5rem)]",
        )}
      >
        <Button
          ref={key}
          variant="outline"
          size="sm"
          aria-expanded={open}
          aria-controls={listId}
          onClick={() => setOpen((o) => !o)}
          className="bg-bg text-ink-muted hover:text-ink aria-expanded:text-ink"
        >
          Credits
        </Button>
        {pinned &&
          (pinned.href ? (
            <a
              href={pinned.href}
              target="_blank"
              rel="noreferrer"
              className="bg-bg/75 px-1.5 py-0.5 font-mono text-label text-ink-muted uppercase transition-colors duration-(--dur-fast) ease-out hover:text-ink"
            >
              {pinned.notice}
            </a>
          ) : (
            <p className="bg-bg/75 px-1.5 py-0.5 font-mono text-label text-ink-muted uppercase">
              {pinned.notice}
            </p>
          ))}
      </div>
    </div>
  );
}
