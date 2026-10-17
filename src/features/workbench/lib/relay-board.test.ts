import { MeshStandardMaterial } from "three";
import { describe, expect, it } from "vitest";
import { bindBoard, litLeds, showMask } from "./relay-board";
import { Terminal } from "./terminal";

/** Eight LED materials lit at 4, as prepareModel leaves them. */
const board = () =>
  Array.from({ length: 8 }, () => {
    const m = new MeshStandardMaterial({ emissiveIntensity: 4 });
    m.userData.lit = 4;
    return m;
  });

const lit = (leds: MeshStandardMaterial[]) =>
  leds.map((m) => (m.emissiveIntensity > 0 ? 1 : 0)).join("");

describe("relay board", () => {
  it("maps CH1 to the first LED and CH8 to the last", () => {
    expect(litLeds(0)).toEqual(Array(8).fill(false));
    expect(litLeds(0b1)[0]).toBe(true);
    expect(litLeds(0x80)[7]).toBe(true);
    expect(litLeds(0xa5)).toEqual([
      true,
      false,
      true,
      false,
      false,
      true,
      false,
      true,
    ]);
  });

  it("lights LEDs at their own intensity and puts the rest out", () => {
    const leds = board();
    showMask(leds, 0b101);
    expect(leds.map((m) => m.emissiveIntensity)).toEqual([
      4, 0, 4, 0, 0, 0, 0, 0,
    ]);
  });

  it("follows the terminal's mask only while it's online", () => {
    const leds = board();
    const t = new Terminal();
    const stop = bindBoard(t, leds);
    // Offline the LEDs are the plug-in action's: left as they are.
    expect(lit(leds)).toBe("11111111");
    t.start();
    expect(lit(leds)).toBe("00000000");
    t.type("set 3 on");
    t.submit();
    expect(lit(leds)).toBe("00100000");
    t.type("write-mask 0xA5");
    t.submit();
    expect(lit(leds)).toBe("10100101");

    t.reset();
    expect(lit(leds)).toBe("10100101");
    t.start();
    expect(lit(leds)).toBe("00000000");

    stop();
    t.type("set 1 on");
    t.submit();
    expect(lit(leds)).toBe("00000000");
  });
});
