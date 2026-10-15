"use client";

import { createContext, useContext, useSyncExternalStore } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

/**
 * Reduced motion, read from the system setting unless <html data-motion>
 * overrides it ("reduced" | "full"; the lab's motion switch sets it).
 * Call it inside effects; it reads the DOM.
 */
export function prefersReducedMotion() {
  const override = document.documentElement.dataset.motion;
  if (override === "reduced") return true;
  if (override === "full") return false;
  return window.matchMedia(QUERY).matches;
}

/**
 * Lab inspection: <html data-motion-speed="slow"> runs everything at ¼ speed.
 * tokens.css stretches the CSS durations to match.
 */
export function timeScale() {
  return document.documentElement.dataset.motionSpeed === "slow" ? 4 : 1;
}

function subscribe(onChange: () => void) {
  const media = window.matchMedia(QUERY);
  const observer = new MutationObserver(onChange);
  media.addEventListener("change", onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-motion"],
  });
  return () => {
    media.removeEventListener("change", onChange);
    observer.disconnect();
  };
}

/** Reactive form of prefersReducedMotion(); false during SSR. */
export function useReducedMotion() {
  return useSyncExternalStore(subscribe, prefersReducedMotion, () => false);
}

/**
 * When an entrance plays.
 * - "view":  when the element's top crosses the view line. Anything already
 *            on screen at first paint stays still, so the pitch never waits.
 * - "mount": as soon as it mounts (replays, client-side inserts).
 */
export type Trigger = "view" | "mount";

const TriggerContext = createContext<Trigger | null>(null);

/** Forces every motion component inside it to one trigger (the lab's Replay uses "mount"). */
export const TriggerOverride = TriggerContext.Provider;

export function useTriggerMode(fallback: Trigger): Trigger {
  return useContext(TriggerContext) ?? fallback;
}
