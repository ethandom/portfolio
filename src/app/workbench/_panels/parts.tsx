import type { ReactNode } from "react";
import { StackMark } from "@/components/manual";
import { cn } from "@/lib/cn";

/**
 * Pieces the panel bodies share. Panels are small, so everything here is the
 * Manual's datasheet look at its quietest: mono captions, hairlines, `sm` type.
 */

/** A block inside a panel, with its mono caption over a hairline. */
export function Part({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("grid gap-3", className)}>
      <h3 className="border-b border-hairline pb-1.5 font-mono text-label text-ink-muted uppercase">
        {label}
      </h3>
      {children}
    </div>
  );
}

/**
 * Tools as brand keycaps with their names, two to a row. A grid, not
 * flex-wrap, so the keycaps line up in columns.
 */
export function Keycaps({
  names,
  label,
  className,
}: {
  names: string[];
  label: string;
  className?: string;
}) {
  return (
    <ul
      aria-label={label}
      className={cn("grid grid-cols-2 gap-x-3 gap-y-2", className)}
    >
      {names.map((name) => (
        <li key={name} className="flex min-w-0 items-center gap-2">
          <StackMark name={name} className="size-6 [&_svg]:size-3.5" />
          <span className="min-w-0 truncate text-sm text-ink">{name}</span>
        </li>
      ))}
    </ul>
  );
}
