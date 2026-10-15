"use client";

import { useEffect, useRef, useState } from "react";
import { PauseIcon, PlayIcon } from "@phosphor-icons/react";
import { prefersReducedMotion } from "@/components/motion";
import { cn } from "@/lib/cn";

/**
 * A product demo that plays itself: muted and looped once at least half of it
 * is on screen, paused when it drops below half. Under reduced motion it
 * waits for a press of Play. Nothing downloads at page load; the file starts
 * loading as soon as the surrounding chapter (Work History) reaches the
 * screen, so the first frame is already there by the time the video is.
 *
 * Just the footage in a 1px ink frame (bone in Night Shift). The one control
 * is the Pause key, which an autoplaying loop owes its viewer.
 */
export function DemoVideo({
  src,
  label,
  className,
}: {
  src: string;
  label: string;
  className?: string;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [preload, setPreload] = useState<"none" | "auto">("none");
  // Once someone presses Pause, scrolling never restarts it.
  const held = useRef(false);

  // Load when the chapter comes in, not when the video itself does.
  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      observer.disconnect();
      setPreload("auto");
    });
    observer.observe(video.closest("section") ?? video);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        // isIntersecting is true at any overlap; the first callback can
        // report 10%, so check the ratio itself.
        if (entry.intersectionRatio >= 0.5) {
          if (!held.current && !prefersReducedMotion()) {
            video.play().catch(() => {});
          }
        } else {
          video.pause();
        }
      },
      { threshold: 0.5 },
    );
    observer.observe(video);
    return () => observer.disconnect();
  }, []);

  function toggle() {
    const video = ref.current;
    if (!video) return;
    if (video.paused) {
      held.current = false;
      video.play().catch(() => {});
    } else {
      held.current = true;
      video.pause();
    }
  }

  return (
    <div className={cn("relative border border-strong bg-sunken", className)}>
      <video
        ref={ref}
        src={src}
        muted
        loop
        playsInline
        preload={preload}
        aria-label={label}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        className="block aspect-video w-full object-contain"
      />
      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? "Pause demo" : "Play demo"}
        className="absolute right-2 bottom-2 inline-flex h-8 items-center gap-2 border border-strong bg-surface px-2.5 font-mono text-label text-ink uppercase transition-colors duration-(--dur-fast) ease-out hover:bg-sunken sm:right-3 sm:bottom-3"
      >
        {playing ? (
          <PauseIcon weight="light" className="size-3.5" />
        ) : (
          <PlayIcon weight="light" className="size-3.5" />
        )}
        {playing ? "Pause" : "Play"}
      </button>
    </div>
  );
}
