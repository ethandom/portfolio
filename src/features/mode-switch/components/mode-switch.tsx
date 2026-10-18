import Link from "next/link";
import { cn } from "@/lib/cn";

export type Mode = "manual" | "workbench";

const MODES: readonly { id: Mode; label: string; href: string }[] = [
  { id: "manual", label: "Manual", href: "/" },
  { id: "workbench", label: "Workbench", href: "/workbench" },
];

/**
 * The view switch, docked bottom center over both views: a Night Shift
 * strip with one key per view. The current one has its LED lit and its label
 * in orange. Plain links, so it works without JS and the Workbench's 3D code
 * only loads once you're there. Hidden on phones (`dock:`), which get the
 * Manual only; where it shows, it takes --dock-room off the screen.
 */
export function ModeSwitch({ current }: { current: Mode }) {
  return (
    <nav
      aria-label="View"
      data-theme="dark"
      className="fixed bottom-4 left-1/2 z-40 hidden h-10 -translate-x-1/2 border border-strong bg-bg p-1 text-ink dock:flex"
    >
      {MODES.map((mode) => {
        const on = mode.id === current;
        return (
          <Link
            key={mode.id}
            href={mode.href}
            aria-current={on ? "page" : undefined}
            className={cn(
              "inline-flex h-full items-center gap-2 px-3 font-mono text-label uppercase transition-colors duration-(--dur-fast) ease-out",
              on ? "text-accent-text" : "text-ink hover:bg-sunken",
            )}
          >
            <span
              aria-hidden
              data-led={on ? "accent" : "off"}
              className={cn("size-1.5 shrink-0", on ? "bg-accent" : "bg-rule")}
            />
            {mode.label}
          </Link>
        );
      })}
    </nav>
  );
}
