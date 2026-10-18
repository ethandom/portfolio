/**
 * The tokens' --ease-in-out, cubic-bezier(0.77, 0, 0.175, 1), is the classic
 * CSS stand-in for easeInOutQuart; this is the curve it approximates.
 */
export function easeInOutQuart(t: number) {
  return t < 0.5 ? 8 * t ** 4 : 1 - (-2 * t + 2) ** 4 / 2;
}

type Tween = {
  duration: number;
  elapsed: number;
  step: (t: number) => void;
  done: () => void;
};

/**
 * Frame-driven tweens: `tick` runs from useFrame, and each `run` returns a
 * promise a sequence can await. One tween per key: starting a key again
 * stops the old one where it is, and stopped tweens resolve too, so a
 * sequence must check whether it was cancelled after each await.
 * `wake` runs whenever a tween starts (or jumps), so an on-demand frame
 * loop knows to draw.
 */
export class Tweens {
  private active = new Map<string, Tween>();

  constructor(private readonly wake: () => void = () => {}) {}

  /** Whether any tween is running (each wants a frame until it ends). */
  get busy() {
    return this.active.size > 0;
  }

  /** `step` gets linear progress 0..1; seconds <= 0 jumps straight to 1. */
  run(key: string, seconds: number, step: (t: number) => void) {
    this.stop(key);
    this.wake();
    return new Promise<void>((resolve) => {
      if (seconds <= 0) {
        step(1);
        resolve();
        return;
      }
      this.active.set(key, {
        duration: seconds,
        elapsed: 0,
        step,
        done: resolve,
      });
    });
  }

  stop(key: string) {
    const tween = this.active.get(key);
    if (!tween) return;
    this.active.delete(key);
    tween.done();
  }

  tick(dt: number) {
    for (const [key, tween] of this.active) {
      tween.elapsed += dt;
      const t = Math.min(tween.elapsed / tween.duration, 1);
      tween.step(t);
      if (t === 1) {
        this.active.delete(key);
        tween.done();
      }
    }
  }
}
