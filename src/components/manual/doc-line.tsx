import type { ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/cn";

/**
 * The running head of a printed manual:
 * NAME | OPERATOR'S MANUAL | ... | P. 01.
 * The last item sits flush right.
 */
export function DocLine({
  className,
  children,
  ...props
}: ComponentPropsWithoutRef<"div">) {
  return (
    <div
      className={cn(
        "relative flex min-h-9 min-w-0 items-stretch overflow-hidden font-mono text-label text-ink-muted uppercase",
        className,
      )}
      {...props}
    >
      {children}
      {/* The ink rule is its own element so motion.css can draw it on. */}
      <span aria-hidden data-rule className="absolute inset-x-0 bottom-0 h-px bg-strong" />
    </div>
  );
}

/**
 * One cell of the running head; cells after the first get a hairline divider.
 * When space runs out, middle cells truncate; the first (name) and last (page) never do.
 */
export function DocLineItem({
  emphasis = false,
  className,
  children,
  ...props
}: ComponentPropsWithoutRef<"span"> & {
  /** Ink instead of muted: the document's name. */
  emphasis?: boolean;
}) {
  return (
    <span
      className={cn(
        "flex min-w-0 items-center px-2 whitespace-nowrap first:shrink-0 first:pl-0 last:ml-auto last:shrink-0 last:pr-0 not-first:border-l not-first:border-hairline sm:px-3",
        emphasis && "font-medium text-ink",
        className,
      )}
      {...props}
    >
      <span className="truncate">{children}</span>
    </span>
  );
}
