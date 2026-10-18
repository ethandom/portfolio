import { Group, Mesh, PerspectiveCamera, Vector3 } from "three";
import { describe, expect, it } from "vitest";
import { cablePoints } from "./cable";
import {
  cloneShot,
  fitVerticalFov,
  horizontalFov,
  projectRect,
  type Rect,
  shotPath,
} from "./framing";
import { hitIdOf, stationOf, zoneOf } from "./hits";
import { easeInOutQuart, Tweens } from "./tweens";

/** A lens as Blender exports it: vertical FOV at 16:9. */
const lens = (hfov: number) => {
  const half = (hfov * Math.PI) / 360;
  const vfov = (2 * Math.atan(Math.tan(half) / (16 / 9)) * 180) / Math.PI;
  return { vfov, hfov };
};

describe("workbench framing", () => {
  it("keeps each camera's authored horizontal FOV", () => {
    for (const hfov of [72, 78, 64]) {
      const l = lens(hfov);
      expect(horizontalFov(l.vfov, 16 / 9)).toBeCloseTo(hfov, 6);
      expect(fitVerticalFov(l, 16 / 9)).toBeCloseTo(l.vfov, 6);
      expect(horizontalFov(fitVerticalFov(l, 4 / 3), 4 / 3)).toBeCloseTo(
        hfov,
        6,
      );
      // Ultrawide keeps the authored vertical, so the horizontal only grows.
      expect(fitVerticalFov(l, 21 / 9)).toBe(l.vfov);
      // Portrait phones stop at 90°.
      expect(fitVerticalFov(l, 390 / 844)).toBe(90);
    }
  });

  it("glides between shots and lands exactly, lens included", () => {
    const from = {
      position: new Vector3(-3, 1.7, 0),
      target: new Vector3(0, 1, -4),
      lens: lens(72),
    };
    const to = {
      position: new Vector3(1, 1.4, -3.3),
      target: new Vector3(1, 1, -5),
      lens: lens(78),
    };
    const shot = cloneShot(from);
    const path = shotPath(shot, to);
    path(shot, 0.5);
    const midway = new Vector3(-1, 1.55, -1.65);
    expect(shot.position.distanceTo(midway)).toBeLessThan(1e-9);
    expect(shot.lens.hfov).toBeCloseTo(75, 9);
    path(shot, 1);
    expect(shot.position.distanceTo(to.position)).toBeLessThan(1e-9);
    expect(shot.target.distanceTo(to.target)).toBeLessThan(1e-9);
    expect(shot.lens).toEqual(to.lens);
    // The source shots are untouched.
    expect(from.position.x).toBe(-3);
  });

  it("projects a box to its screen rect", () => {
    // 90° square view from the origin down -Z, on a 100×100 canvas.
    const camera = new PerspectiveCamera(90, 1, 0.1, 100);
    camera.updateMatrixWorld();
    const box = [-1, 1].flatMap((x) =>
      [-1, 1].flatMap((y) => [-2, -3].map((z) => new Vector3(x, y, z))),
    );
    const near = (rect: Rect | null, [x, y, width, height]: number[]) => {
      expect(rect).not.toBeNull();
      expect(rect?.x).toBeCloseTo(x, 6);
      expect(rect?.y).toBeCloseTo(y, 6);
      expect(rect?.width).toBeCloseTo(width, 6);
      expect(rect?.height).toBeCloseTo(height, 6);
    };
    // The near face (z = -2) lands at ±0.5 of the half-view.
    near(projectRect(box, camera, 100, 100), [25, 25, 50, 50]);
    // Shifted right: the far face's left edge (x = 1 at z = -3) leads,
    // and the right side is clipped at the viewport edge.
    const right = box.map((p) => p.clone().setX(p.x + 2));
    const left = ((1 / 3 + 1) / 2) * 100;
    near(projectRect(right, camera, 100, 100), [left, 25, 100 - left, 50]);
    // Behind the camera: nothing to draw.
    const behind = box.map((p) => p.clone().setZ(-p.z));
    expect(projectRect(behind, camera, 100, 100)).toBeNull();
  });

  it("finds the Hit_ group, station and zone of an object", () => {
    const hit = new Group();
    hit.name = "Hit_relay";
    hit.userData.station = "workbench";
    const part = new Mesh();
    hit.add(part);
    expect(hitIdOf(part)).toBe("relay");
    expect(stationOf(part)).toBe("workbench");
    expect(zoneOf(part)).toBeNull();

    const zone = new Mesh();
    zone.name = "Zone_lounge";
    zone.userData.station = "lounge";
    expect(zoneOf(zone)).toBe("lounge");

    const odd = new Group();
    odd.name = "Hit_unknown";
    odd.userData.station = "garage";
    expect(hitIdOf(odd)).toBeNull();
    expect(stationOf(odd)).toBeNull();
    expect(stationOf(new Group())).toBeNull();
  });

  it("lays the cable with slack that tightens as the plug moves away", () => {
    const start = new Vector3(0, 0.764, 0);
    const exit = new Vector3(-1, 0, 0);
    const near = new Vector3(0.4, 0.764, 0);
    const length = 0.4 * 1.12;
    const loose = cablePoints(start, near, exit, length);
    expect(loose[0].distanceTo(start)).toBe(0);
    expect(loose.at(-1)?.distanceTo(near)).toBe(0);
    // It stays on the bench.
    expect(loose.every((p) => p.y === 0.764)).toBe(true);
    const sag = (points: Vector3[]) =>
      Math.max(...points.map((p) => Math.abs(p.z)));
    const far = new Vector3(0.45, 0.764, 0);
    const tighter = cablePoints(start, far, exit, length);
    expect(sag(tighter)).toBeLessThan(sag(loose));
    const taut = cablePoints(start, new Vector3(0.6, 0.764, 0), exit, length);
    expect(sag(taut)).toBe(0);
  });

  it("runs tweens per key, and a restart settles the old one", async () => {
    expect(easeInOutQuart(0)).toBe(0);
    expect(easeInOutQuart(0.5)).toBe(0.5);
    expect(easeInOutQuart(1)).toBe(1);
    let wakes = 0;
    const tweens = new Tweens(() => wakes++);
    const seen: number[] = [];
    const first = tweens.run("camera", 1, (t) => seen.push(t));
    expect(tweens.busy).toBe(true);
    tweens.tick(0.5);
    const second = tweens.run("camera", 0, (t) => seen.push(t));
    await Promise.all([first, second]);
    expect(seen).toEqual([0.5, 1]);
    // Each start asks for a frame; nothing runs once both settle.
    expect(wakes).toBe(2);
    expect(tweens.busy).toBe(false);
  });
});
