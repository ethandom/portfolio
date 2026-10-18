/** Milliseconds a low-rate frame is asked for early: the frame itself still waits for the next vsync. */
const VSYNC_SLACK = 1000 / 120;

/**
 * Frames on demand (the Canvas runs `frameloop="demand"`). Something that
 * moves asks for the next frame (`now`); something that animates at a low
 * rate asks for one within its interval (`within`), and the earliest
 * request wins, so low-rate animations share one cadence instead of
 * interleaving theirs. With nothing asking, nothing draws.
 */
export class Pacer {
  private due = Infinity;
  private timer: ReturnType<typeof setTimeout> | undefined;

  constructor(
    private readonly invalidate: () => void,
    private readonly clock: () => number = () => performance.now(),
  ) {}

  /** A frame as soon as the browser draws one. */
  now() {
    this.invalidate();
  }

  /** A frame within `seconds` from now. */
  within(seconds: number) {
    const at = this.clock() + seconds * 1000;
    if (at >= this.due) return;
    this.due = at;
    clearTimeout(this.timer);
    this.timer = setTimeout(
      () => {
        this.due = Infinity;
        this.timer = undefined;
        this.invalidate();
      },
      Math.max(0, at - this.clock() - VSYNC_SLACK),
    );
  }

  dispose() {
    clearTimeout(this.timer);
    this.timer = undefined;
    this.due = Infinity;
  }
}
