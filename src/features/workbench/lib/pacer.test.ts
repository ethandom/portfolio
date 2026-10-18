import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Pacer } from "./pacer";

describe("Pacer", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  const pacer = () => {
    const frames = vi.fn();
    return { frames, pacer: new Pacer(frames, () => Date.now()) };
  };

  it("asks for a frame right away", () => {
    const { frames, pacer: p } = pacer();
    p.now();
    expect(frames).toHaveBeenCalledOnce();
  });

  it("shares one cadence: the earliest request wins", () => {
    const { frames, pacer: p } = pacer();
    p.within(1 / 30);
    p.within(1 / 10);
    p.within(1 / 30);
    vi.advanceTimersByTime(20);
    expect(frames).not.toHaveBeenCalled();
    // Half a 60 Hz frame early, for the vsync the frame still waits on.
    vi.advanceTimersByTime(6);
    expect(frames).toHaveBeenCalledOnce();
    vi.advanceTimersByTime(200);
    expect(frames).toHaveBeenCalledOnce();
  });

  it("moves a later request up, and draws nothing once disposed", () => {
    const { frames, pacer: p } = pacer();
    p.within(1);
    p.within(0.05);
    vi.advanceTimersByTime(50);
    expect(frames).toHaveBeenCalledOnce();
    p.within(0.05);
    p.dispose();
    vi.advanceTimersByTime(1000);
    expect(frames).toHaveBeenCalledOnce();
  });
});
