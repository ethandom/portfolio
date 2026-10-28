import { bit, CHANNELS } from "@/lib/relayctl";
import type { Cue } from "./sfx";
import type { Terminal } from "./terminal";

/** What the sounds compare between two moments of the bench terminal. */
export type TerminalShot = Pick<Terminal, "online" | "rows" | "input" | "caret" | "mask">;

export const shoot = (terminal: Terminal): TerminalShot => ({
  online: terminal.online,
  rows: terminal.rows,
  input: terminal.input,
  caret: terminal.caret,
  mask: terminal.mask,
});

export type Sounding = { cue: Cue; delay: number };

/** Seconds from Enter to the first relay click, then between channels: a quick rattle. */
export const RELAY_DELAY = 0.05;
export const RELAY_STAGGER = 0.022;

/**
 * The sounds a change to the bench terminal makes: the prompt coming up;
 * Enter when new rows print (a command ran, Tab listed names, Ctrl+C,
 * Ctrl+L), with two low pips if relayctl answered with an error; otherwise
 * a key for any edit or caret move; and a click for every relay channel
 * the mask switched, CH1 first. Unplugging is the plug action's sound.
 */
export function terminalSounds(before: TerminalShot, after: TerminalShot): Sounding[] {
  if (!after.online) return [];
  if (!before.online) return [{ cue: "ready", delay: 0 }];
  const sounds: Sounding[] = [];
  if (after.rows !== before.rows) {
    sounds.push({ cue: "enter", delay: 0 });
    // The newest command's output: the rows after its echo.
    let echo = after.rows.length - 1;
    while (echo >= 0 && after.rows[echo].kind !== "cmd") echo--;
    if (after.rows.slice(echo + 1).some((row) => row.tone === "err")) {
      sounds.push({ cue: "error", delay: 0.08 });
    }
  } else if (after.input !== before.input || after.caret !== before.caret) {
    sounds.push({ cue: "key", delay: 0 });
  }
  const switched = before.mask ^ after.mask;
  let clicks = 0;
  for (let ch = 1; ch <= CHANNELS; ch++) {
    if (!(switched & bit(ch))) continue;
    sounds.push({
      cue: after.mask & bit(ch) ? "relay-on" : "relay-off",
      delay: RELAY_DELAY + clicks++ * RELAY_STAGGER,
    });
  }
  return sounds;
}
