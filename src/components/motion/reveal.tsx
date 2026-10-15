"use client";

import { useRef, type CSSProperties, type ReactNode } from "react";
import { useTriggerMode, type Trigger } from "./preference";
import { useEntrance } from "./use-entrance";

type RevealTag = "div" | "section" | "header" | "ul" | "ol" | "li" | "span" | "p";

/**
 * An entrance, printed rather than floated in.
 *
 * - "print": the block is printed top to bottom (a clip wipe), like a sheet
 *   passing under the head. For content: rows, figures, prose.
 * - "rules": every `[data-rule]` inside draws left to right in ink while the
 *   text fades in. For chapter headers and the running head.
 *
 * Styles live in src/styles/motion.css; this only sets `data-reveal`.
 */
export function Reveal({
  as = "div",
  variant = "print",
  delay = 0,
  trigger: triggerProp = "view",
  className,
  style,
  children,
}: {
  as?: RevealTag;
  variant?: "print" | "rules";
  /** Milliseconds; use `stagger(i)` for lists. Scales to 0 under reduced motion. */
  delay?: number;
  trigger?: Trigger;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  const Tag = as as "div";
  const ref = useRef<HTMLDivElement>(null);
  const trigger = useTriggerMode(triggerProp);

  useEntrance(ref, trigger, {
    prepare: (el) => {
      el.dataset.reveal = "pending";
    },
    play: (el) => {
      el.dataset.reveal = "play";
    },
  });

  return (
    <Tag
      ref={ref}
      data-reveal="idle"
      data-variant={variant}
      className={className}
      style={{ ...style, "--reveal-delay": `${delay}ms` } as CSSProperties}
    >
      {children}
    </Tag>
  );
}
