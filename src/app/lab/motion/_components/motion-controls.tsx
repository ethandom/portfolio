"use client";

import { useEffect, useState } from "react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

type Preference = "system" | "full" | "reduced";
type Speed = "1" | "slow";

/**
 * Lab-only: overrides the reduced-motion setting and slows everything to ¼
 * speed, through <html data-motion> and <html data-motion-speed>.
 * Both are cleared when you leave the page.
 */
export function MotionControls() {
  const [preference, setPreference] = useState<Preference>("system");
  const [speed, setSpeed] = useState<Speed>("1");

  useEffect(() => {
    const root = document.documentElement;
    return () => {
      delete root.dataset.motion;
      delete root.dataset.motionSpeed;
    };
  }, []);

  function applyPreference(next: string) {
    if (!next) return;
    const root = document.documentElement;
    if (next === "system") delete root.dataset.motion;
    else root.dataset.motion = next;
    setPreference(next as Preference);
  }

  function applySpeed(next: string) {
    if (!next) return;
    const root = document.documentElement;
    if (next === "1") delete root.dataset.motionSpeed;
    else root.dataset.motionSpeed = next;
    setSpeed(next as Speed);
  }

  return (
    <div className="flex flex-wrap gap-2">
      <ToggleGroup
        type="single"
        size="sm"
        value={preference}
        onValueChange={applyPreference}
        aria-label="Motion preference"
      >
        <ToggleGroupItem value="system">System</ToggleGroupItem>
        <ToggleGroupItem value="full">Full</ToggleGroupItem>
        <ToggleGroupItem value="reduced">Reduced</ToggleGroupItem>
      </ToggleGroup>
      <ToggleGroup type="single" size="sm" value={speed} onValueChange={applySpeed} aria-label="Speed">
        <ToggleGroupItem value="1">1×</ToggleGroupItem>
        <ToggleGroupItem value="slow">¼×</ToggleGroupItem>
      </ToggleGroup>
    </div>
  );
}
