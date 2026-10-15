"use client";

import { useEffect, useEffectEvent, type RefObject } from "react";
import { prefersReducedMotion } from "@/components/motion";

/**
 * Plays a figure the first time it comes into view. A figure already on
 * screen at load stays in its final state, and so does everything under
 * reduced motion. Also covers figures inside a closed <details>: they are
 * off screen until the row opens.
 */
export function useFirstView(
  ref: RefObject<Element | null>,
  handlers: { hide: () => void; play: () => void },
) {
  const hide = useEffectEvent(handlers.hide);
  const play = useEffectEvent(handlers.play);

  useEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion()) return;
    let first = true;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (first) {
          first = false;
          if (entry.isIntersecting) return observer.disconnect();
          return hide();
        }
        if (!entry.isIntersecting) return;
        observer.disconnect();
        play();
      },
      { threshold: 0.4 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref]);
}
