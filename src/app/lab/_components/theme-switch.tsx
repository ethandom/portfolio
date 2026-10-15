"use client";

import { useState } from "react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

type Theme = "system" | "light" | "dark";

/** Lab-only: flips <html data-theme> to preview Night Shift. */
export function ThemeSwitch() {
  const [theme, setTheme] = useState<Theme>("system");

  function apply(next: string) {
    if (!next) return;
    const root = document.documentElement;
    if (next === "system") delete root.dataset.theme;
    else root.dataset.theme = next;
    setTheme(next as Theme);
  }

  return (
    <ToggleGroup type="single" size="sm" value={theme} onValueChange={apply} aria-label="Theme">
      <ToggleGroupItem value="system">System</ToggleGroupItem>
      <ToggleGroupItem value="light">Light</ToggleGroupItem>
      <ToggleGroupItem value="dark">Night</ToggleGroupItem>
    </ToggleGroup>
  );
}
