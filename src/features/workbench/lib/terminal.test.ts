import { describe, expect, it, vi } from "vitest";
import {
  HINT,
  layout,
  MAX_INPUT,
  MAX_ROWS,
  type Screen,
  Terminal,
  wrap,
} from "./terminal";

const online = (banner: string[] = []) => {
  const t = new Terminal();
  t.start(banner);
  return t;
};

const enter = (t: Terminal, line: string) => {
  t.type(line);
  return t.submit();
};

/** The screen as plain text, one string per row. */
const text = (screen: Screen) =>
  screen.lines.map((spans) => spans.map((s) => s.text).join(""));

describe("Terminal", () => {
  it("does nothing until the board is up", () => {
    const t = new Terminal();
    t.type("set 1 on");
    expect(t.submit()).toEqual([]);
    expect(t.tab()).toBe(false);
    expect([t.input, t.mask, t.rows]).toEqual(["", 0, []]);
  });

  it("starts a session with the banner on screen and every channel off", () => {
    const t = online(["usbrelay: 8 channels ready", ""]);
    expect(t.online).toBe(true);
    expect(t.rows.map((r) => r.text)).toEqual([
      "usbrelay: 8 channels ready",
      "",
    ]);
    expect(t.mask).toBe(0);
    expect(t.fresh).toBe(true);
    expect(t.said?.text).toMatch(/ready/);
  });

  it("runs commands: echoes them, prints the output and keeps the mask", () => {
    const t = online();
    expect(enter(t, "set 3 on")).toEqual([
      { text: "OK CH=3 STATE=ON", tone: "ok" },
    ]);
    expect(t.mask).toBe(0b100);
    enter(t, "relayctl toggle 1");
    enter(t, "set 9 on");
    expect(t.mask).toBe(0b101);
    expect(t.rows).toEqual([
      { kind: "cmd", text: "set 3 on", tone: "out" },
      { kind: "out", text: "OK CH=3 STATE=ON", tone: "ok" },
      { kind: "cmd", text: "relayctl toggle 1", tone: "out" },
      { kind: "out", text: "OK CH=1 STATE=ON", tone: "ok" },
      { kind: "cmd", text: "set 9 on", tone: "out" },
      {
        kind: "out",
        text: "ERR BAD_CHANNEL Channel must be 1..8",
        tone: "err",
      },
    ]);
    expect(t.input).toBe("");
    expect(t.fresh).toBe(false);
    expect(t.said?.text).toBe("ERR BAD_CHANNEL Channel must be 1..8");

    enter(t, "write-mask 0xA5");
    expect(t.mask).toBe(0xa5);
    enter(t, "reset");
    expect(t.mask).toBe(0);
  });

  it("echoes an empty line as a new prompt", () => {
    const t = online();
    t.submit();
    expect(t.rows).toEqual([{ kind: "cmd", text: "", tone: "out" }]);
  });

  it("edits the line at the caret", () => {
    const t = online();
    t.type("st 1 on");
    t.home();
    t.move(1);
    t.type("e");
    expect([t.input, t.caret]).toEqual(["set 1 on", 2]);
    t.end();
    t.backspace();
    t.backspace();
    t.type("off");
    expect(t.input).toBe("set 1 off");
    t.home();
    t.deleteForward();
    expect([t.input, t.caret]).toEqual(["et 1 off", 0]);
    t.move(-5);
    expect(t.caret).toBe(0);
    t.move(99);
    expect(t.caret).toBe(t.input.length);
  });

  it("kills to the start of the line, interrupts and clears", () => {
    const t = online(["boot"]);
    t.type("set 2 on");
    t.move(-3);
    t.killLine();
    expect([t.input, t.caret]).toEqual([" on", 0]);

    t.interrupt();
    expect(t.rows.at(-1)).toEqual({ kind: "cmd", text: " on^C", tone: "out" });
    expect(t.input).toBe("");

    t.type("get 1");
    t.clearScreen();
    expect(t.rows).toEqual([]);
    expect(t.input).toBe("get 1");

    t.submit();
    t.type("clear");
    expect(t.submit()).toEqual([]);
    expect(t.rows).toEqual([]);
  });

  it("caps the line and drops control characters", () => {
    const t = online();
    t.type("set\t1\non\u001b");
    expect(t.input).toBe("set1on");
    t.type("x".repeat(80));
    expect(t.input).toHaveLength(MAX_INPUT);
    t.sync("ping\r", 99);
    expect([t.input, t.caret]).toEqual(["ping", 4]);
  });

  it("walks history with up and down, back to the line being typed", () => {
    const t = online();
    enter(t, "set 1 on");
    enter(t, "getall");
    enter(t, "getall");
    t.type("tog");
    t.recall(-1);
    expect(t.input).toBe("getall");
    t.recall(-1);
    expect(t.input).toBe("set 1 on");
    t.recall(-1);
    expect([t.input, t.caret]).toEqual(["set 1 on", 8]);
    t.recall(1);
    t.recall(1);
    expect(t.input).toBe("tog");
    t.recall(1);
    expect(t.input).toBe("tog");
  });

  it("completes with Tab, lists several names, lets Tab go when empty", () => {
    const t = online();
    expect(t.tab()).toBe(false);
    t.type("wri");
    expect(t.tab()).toBe(true);
    expect(t.input).toBe("write-mask ");

    t.killLine();
    t.type("re");
    expect(t.tab()).toBe(true);
    expect(t.input).toBe("re");
    expect(t.rows.slice(-2)).toEqual([
      { kind: "cmd", text: "re", tone: "out" },
      { kind: "out", text: "relayctl  read-mask  reset", tone: "dim" },
    ]);
    t.end();
    t.type("s");
    t.tab();
    expect(t.input).toBe("reset ");
  });

  it("keeps a capped scrollback", () => {
    const t = online();
    for (let i = 0; i < MAX_ROWS; i++) enter(t, "ping");
    expect(t.rows).toHaveLength(MAX_ROWS);
    expect(t.rows.at(-1)).toEqual({ kind: "out", text: "OK", tone: "ok" });
  });

  it("resets to a blank, offline screen and keeps history", () => {
    const t = online();
    enter(t, "write-mask 0xFF");
    t.reset();
    expect([t.online, t.mask, t.rows, t.input]).toEqual([false, 0, [], ""]);
    t.start();
    t.recall(-1);
    expect(t.input).toBe("write-mask 0xFF");
  });

  it("tells its listeners about every change, and only changes", () => {
    const t = new Terminal();
    const heard = vi.fn();
    const stop = t.subscribe(heard);
    t.reset(); // already blank
    expect(heard).not.toHaveBeenCalled();
    t.start();
    t.type("p");
    t.move(5); // already at the end
    t.setFocused(true);
    t.setFocused(true);
    expect(heard).toHaveBeenCalledTimes(3);
    expect(t.version).toBe(3);
    stop();
    t.type("i");
    expect(heard).toHaveBeenCalledTimes(3);
  });
});

describe("layout", () => {
  it("puts the prompt last, with the hint before the first command", () => {
    const t = online(["boot line", ""]);
    const screen = layout(t, 44);
    expect(text(screen)).toEqual(["boot line", "", `$   ${HINT}`]);
    expect(screen.lines.at(-1)?.[0]).toEqual({ text: "$ ", ink: "prompt" });
    expect(screen.caret).toEqual({ line: 2, column: 2, char: " " });
  });

  it("colors echoes and output, and wraps long output", () => {
    const t = online();
    enter(t, "relayctl -d /dev/usbrelay3 ping");
    t.type("set 1 on");
    t.move(-2);
    const screen = layout(t, 44);
    expect(text(screen)).toEqual([
      "$ relayctl -d /dev/usbrelay3 ping",
      "ERR DEVICE_UNAVAILABLE Failed to open device",
      "  /dev/usbrelay3 (errno=2)",
      "$ set 1 on",
    ]);
    expect(screen.lines[0].map((s) => s.ink)).toEqual(["prompt", "out"]);
    expect(screen.lines[1][0].ink).toBe("err");
    expect(screen.caret).toEqual({ line: 3, column: 8, char: "o" });
  });

  it("hangs help rows under their description column", () => {
    const t = online();
    enter(t, "help");
    const rows = text(layout(t, 24));
    expect(rows).toContain("set <ch> <on|off> Set on");
    expect(rows).toContain("                  or off");
  });
});

describe("wrap", () => {
  it("wraps at words, indents continuations, and breaks long words", () => {
    expect(wrap("one two three", 7)).toEqual(["one two", "  three"]);
    expect(wrap("a  b", 10)).toEqual(["a  b"]);
    expect(wrap("abcdefghij", 4, 0)).toEqual(["abcd", "efgh", "ij"]);
    expect(wrap("", 10)).toEqual([""]);
  });
});
