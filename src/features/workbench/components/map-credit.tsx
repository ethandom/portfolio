import { cn } from "@/lib/cn";
import type { Credit } from "@/lib/content";

/** In `next dev` Next's badge holds the corner (20–56px); production has none. */
const DEV_BADGE = process.env.NODE_ENV === "development";

/**
 * Bottom left, over the scene: the city view's map credit, linked to its
 * copyright page. OpenStreetMap asks for it where the map shows, without a
 * click to find it; every other credit is in CREDITS.md at the repo root.
 * Night Shift like the scene, centered on the view switch's row and kept left
 * of it (where that's too narrow it wraps), and shown where the switch is
 * (`dock:`, the screens that get the scene).
 */
export function MapCredit({ credit }: { credit: Credit }) {
  return (
    <p
      data-theme="dark"
      className={cn(
        "fixed bottom-4 z-40 hidden h-10 items-center dock:flex",
        DEV_BADGE
          ? "left-18 max-w-[calc(50vw-11.5rem)]"
          : "left-4 max-w-[calc(50vw-8.5rem)]",
      )}
    >
      <a
        href={credit.href}
        target="_blank"
        rel="noreferrer"
        className="bg-bg/75 px-1.5 py-0.5 font-mono text-label text-ink-muted uppercase transition-colors duration-(--dur-fast) ease-out hover:text-ink"
      >
        {credit.notice}
      </a>
    </p>
  );
}
