import type { MeshStandardMaterial, Object3D } from "three";
import { bit, CHANNELS } from "@/lib/relayctl";
import type { Terminal } from "./terminal";

/**
 * Which LEDs a mask lights, in model order: index i is LED_{i+1}, which is
 * channel i, which relayctl calls CH{i+1} (bit i).
 */
export function litLeds(mask: number): boolean[] {
  return Array.from({ length: CHANNELS }, (_, i) => Boolean(mask & bit(i + 1)));
}

/**
 * An LED on at the intensity the export gave it (prepareModel keeps it in
 * userData.lit), or off, with its glow if it has one (userData.glow).
 */
export function setLit(material: MeshStandardMaterial, on: boolean) {
  material.emissiveIntensity = on ? (material.userData.lit as number) : 0;
  const glow = material.userData.glow as Object3D | undefined;
  if (glow) glow.visible = on;
}

/** Lights the relay board's LEDs (model.leds.relay, LED_1 first) to match a mask. */
export function showMask(leds: readonly MeshStandardMaterial[], mask: number) {
  litLeds(mask).forEach((on, i) => {
    const led = leds[i];
    if (led) setLit(led, on);
  });
}

/**
 * Keeps the LEDs on the terminal's mask while it's online; offline, they're
 * the plug-in action's (it flickers them on, and puts them out on unplug).
 * Returns the unsubscribe.
 */
export function bindBoard(
  terminal: Terminal,
  leds: readonly MeshStandardMaterial[],
) {
  let shown: number | null = null;
  return terminal.subscribe(() => {
    if (!terminal.online) {
      shown = null;
      return;
    }
    if (terminal.mask === shown) return;
    shown = terminal.mask;
    showMask(leds, shown);
  });
}
