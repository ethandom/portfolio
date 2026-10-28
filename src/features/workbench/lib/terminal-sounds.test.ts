import { describe, expect, it } from "vitest";
import { Terminal } from "./terminal";
import { RELAY_DELAY, RELAY_STAGGER, shoot, terminalSounds } from "./terminal-sounds";

/** Runs `change` on the terminal and returns the sounds it makes. */
function heard(terminal: Terminal, change: () => void) {
  const before = shoot(terminal);
  change();
  return terminalSounds(before, shoot(terminal));
}

const online = () => {
  const terminal = new Terminal();
  terminal.start(["booted"]);
  return terminal;
};

describe("terminalSounds", () => {
  it("chimes when the prompt comes up, and is quiet while unplugged", () => {
    const terminal = new Terminal();
    expect(heard(terminal, () => terminal.type("x"))).toEqual([]);
    expect(heard(terminal, () => terminal.start())).toEqual([{ cue: "ready", delay: 0 }]);
    expect(heard(terminal, () => terminal.reset())).toEqual([]);
  });

  it("clicks a key for each edit and caret move, but not for focus", () => {
    const terminal = online();
    expect(heard(terminal, () => terminal.type("s"))).toEqual([{ cue: "key", delay: 0 }]);
    expect(heard(terminal, () => terminal.move(-1))).toEqual([{ cue: "key", delay: 0 }]);
    expect(heard(terminal, () => terminal.backspace())).toEqual([]);
    expect(heard(terminal, () => terminal.setFocused(true))).toEqual([]);
  });

  it("presses Enter, then clicks each relay the command switched, CH1 first", () => {
    const terminal = online();
    terminal.sync("set 3 on", 8);
    expect(heard(terminal, () => terminal.submit())).toEqual([
      { cue: "enter", delay: 0 },
      { cue: "relay-on", delay: RELAY_DELAY },
    ]);
    terminal.sync("write-mask 0x03", 15);
    expect(heard(terminal, () => terminal.submit())).toEqual([
      { cue: "enter", delay: 0 },
      { cue: "relay-on", delay: RELAY_DELAY },
      { cue: "relay-on", delay: RELAY_DELAY + RELAY_STAGGER },
      { cue: "relay-off", delay: RELAY_DELAY + 2 * RELAY_STAGGER },
    ]);
  });

  it("adds two low pips when relayctl answers with an error", () => {
    const terminal = online();
    terminal.sync("set 9 on", 8);
    expect(heard(terminal, () => terminal.submit())).toEqual([
      { cue: "enter", delay: 0 },
      { cue: "error", delay: 0.08 },
    ]);
    // An empty line prints only its echo: no error left over from the last one.
    expect(heard(terminal, () => terminal.submit())).toEqual([{ cue: "enter", delay: 0 }]);
  });
});
