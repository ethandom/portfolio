"use client";

import { useEffectEvent, useLayoutEffect, type RefObject } from "react";
import { VIEW_LINE, VIEW_ROOT_MARGIN } from "@/lib/motion/presets";
import { prefersReducedMotion, type Trigger } from "./preference";

/**
 * Shared entrance timing for every motion component.
 *
 * The server renders the final state, so a failed or slow script never hides
 * content. On mount, an element that is still below the view line is
 * `prepare`d (put in its start state) and `play`s when it scrolls in.
 * Under reduced motion nothing is prepared: the final state just stays.
 */
export function useEntrance<T extends Element>(
  ref: RefObject<T | null>,
  trigger: Trigger,
  handlers: { prepare: (el: T) => void; play: (el: T) => void },
) {
  const prepare = useEffectEvent(handlers.prepare);
  const play = useEffectEvent(handlers.play);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion()) return;

    if (trigger === "mount") {
      // A background tab (a ctrl-clicked link) has no frames to play into.
      if (document.hidden) return;
      prepare(el);
      const frame = requestAnimationFrame(() => play(el));
      return () => cancelAnimationFrame(frame);
    }

    if (el.getBoundingClientRect().top < window.innerHeight * VIEW_LINE) return;

    prepare(el);
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        play(el);
      },
      { rootMargin: VIEW_ROOT_MARGIN },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref, trigger]);
}
