import { describe, expect, it } from "vitest";
import { complete, run } from "./relayctl";

const say = (input: string, mask = 0) =>
  run(input, mask).lines.map((l) => l.text);

describe("relayctl port", () => {
  it("sets, toggles and reads channels like the C tool", () => {
    expect(run("relayctl set 1 on", 0)).toMatchObject({
      mask: 0b1,
      lines: [{ text: "OK CH=1 STATE=ON", tone: "ok" }],
    });
    expect(run("toggle 8", 0b1).mask).toBe(0x81);
    expect(say("get 8", 0x81)).toEqual(["OK CH=8 STATE=ON"]);
    expect(say("SET 3 On", 0)).toEqual(["OK CH=3 STATE=ON"]);
    expect(run("set 1 off", 0x81).mask).toBe(0x80);
  });

  it("writes and reads the whole mask", () => {
    expect(run("write-mask 0xa5", 0)).toMatchObject({ mask: 0xa5 });
    expect(say("write-mask 0xa5")).toEqual(["OK MASK=0xA5"]);
    expect(say("getall", 0x0f)).toEqual(["OK MASK=0x0F"]);
    expect(say("read-mask", 0x0f)).toEqual(["OK MASK=0x0F"]);
    expect(run("reset", 0xff).mask).toBe(0);
  });

  it("returns the C tool's error codes", () => {
    expect(say("set 9 on")).toEqual(["ERR BAD_CHANNEL Channel must be 1..8"]);
    expect(say("set 1 maybe")).toEqual([
      "ERR BAD_STATE State must be ON or OFF",
    ]);
    expect(say("set 1")).toEqual([
      "ERR BAD_COMMAND set requires: set <ch> <on|off>",
    ]);
    expect(say("toggle 1 2")).toEqual([
      "ERR BAD_COMMAND Unexpected extra arguments",
    ]);
    expect(say("write-mask 0x100")).toEqual(["ERR BAD_MASK Mask must be 0xHH"]);
    expect(say("relayctl blink")).toEqual([
      "ERR BAD_COMMAND Unknown command: blink",
    ]);
    expect(say("relayctl -x ping")).toEqual([
      "ERR BAD_COMMAND Unknown option: -x",
    ]);
    expect(say("relayctl -d /dev/usbrelay3 ping")).toEqual([
      "ERR DEVICE_UNAVAILABLE Failed to open device /dev/usbrelay3 (errno=2)",
    ]);
    expect(say("ls")).toEqual(["sh: ls: command not found"]);
  });

  it("leaves the mask alone on errors", () => {
    expect(run("set 12 on", 0x42).mask).toBe(0x42);
  });

  it("completes command names", () => {
    expect(complete("tog")).toBe("toggle ");
    expect(complete("relayctl wri")).toBe("relayctl write-mask ");
    expect(complete("re")).toBe("re");
  });
});
