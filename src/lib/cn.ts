import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";
import { createTV } from "tailwind-variants";

/**
 * tokens.css adds two font sizes Tailwind doesn't ship. Without this,
 * tailwind-merge reads `text-label` as a color and drops it next to
 * `text-ink-muted`.
 */
const twMergeConfig = {
  extend: { classGroups: { "font-size": [{ text: ["label", "display"] }] } },
};

const twMerge = extendTailwindMerge(twMergeConfig);

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** `tv()` with the same merge rules as `cn()`. Import it from here, not tailwind-variants. */
export const tv = createTV({ twMergeConfig });
