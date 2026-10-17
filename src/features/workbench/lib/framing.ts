import {
  MathUtils,
  type PerspectiveCamera,
  Quaternion,
  Vector3,
} from "three";

/** A camera's lens as authored in Blender, in degrees, at its 16:9 aspect. */
export type Lens = { vfov: number; hfov: number };

/** Where the camera sits, what it looks at, and its lens. */
export type Shot = { position: Vector3; target: Vector3; lens: Lens };

/** Vertical FOV never opens past this on tall viewports (degrees). */
const MAX_VFOV = 90;

/** Degrees in, degrees out. */
export function horizontalFov(vfov: number, aspect: number) {
  const half = MathUtils.degToRad(vfov) / 2;
  return MathUtils.radToDeg(2 * Math.atan(Math.tan(half) * aspect));
}

/**
 * Vertical FOV that keeps the authored horizontal FOV at this aspect.
 * Wider than 16:9 keeps the authored vertical instead (so the horizontal
 * grows); portrait phones stop at MAX_VFOV and lose some of the sides.
 */
export function fitVerticalFov(lens: Lens, aspect: number) {
  const half = MathUtils.degToRad(lens.hfov) / 2;
  const vfov = MathUtils.radToDeg(2 * Math.atan(Math.tan(half) / aspect));
  return MathUtils.clamp(vfov, lens.vfov, MAX_VFOV);
}

export function cloneShot(shot: Shot): Shot {
  return {
    position: shot.position.clone(),
    target: shot.target.clone(),
    lens: { ...shot.lens },
  };
}

/**
 * Camera path between two shots: the position moves in a straight line,
 * the view direction turns along the arc between the two, and the lens
 * eases across. Both shots are copied, so `out` can be the shot in motion.
 */
export function shotPath(from: Shot, to: Shot) {
  const [a0, a1] = [cloneShot(from), cloneShot(to)];
  const da = a0.target.clone().sub(a0.position);
  const db = a1.target.clone().sub(a1.position);
  const [la, lb] = [da.length(), db.length()];
  const turn = new Quaternion().setFromUnitVectors(
    da.normalize(),
    db.normalize(),
  );
  const q = new Quaternion();
  const dir = new Vector3();
  return (out: Shot, k: number) => {
    out.position.lerpVectors(a0.position, a1.position, k);
    dir.copy(da).applyQuaternion(q.identity().slerp(turn, k));
    out.target
      .copy(out.position)
      .addScaledVector(dir, MathUtils.lerp(la, lb, k));
    out.lens.vfov = MathUtils.lerp(a0.lens.vfov, a1.lens.vfov, k);
    out.lens.hfov = MathUtils.lerp(a0.lens.hfov, a1.lens.hfov, k);
  };
}

export type Rect = { x: number; y: number; width: number; height: number };

const corner = new Vector3();

/**
 * Screen-space bounding rect (CSS px) of world points, clipped to the
 * viewport. Points behind the camera are skipped; null when none is in
 * front or the rect is off screen. The camera's matrices must be current.
 */
export function projectRect(
  points: Vector3[],
  camera: PerspectiveCamera,
  width: number,
  height: number,
): Rect | null {
  let [left, top, right, bottom] = [Infinity, Infinity, -Infinity, -Infinity];
  for (const p of points) {
    corner.copy(p).applyMatrix4(camera.matrixWorldInverse);
    if (corner.z > -camera.near) continue;
    corner.applyMatrix4(camera.projectionMatrix);
    const x = ((corner.x + 1) / 2) * width;
    const y = ((1 - corner.y) / 2) * height;
    left = Math.min(left, x);
    right = Math.max(right, x);
    top = Math.min(top, y);
    bottom = Math.max(bottom, y);
  }
  left = Math.max(left, 0);
  top = Math.max(top, 0);
  right = Math.min(right, width);
  bottom = Math.min(bottom, height);
  if (!(right > left && bottom > top)) return null;
  return { x: left, y: top, width: right - left, height: bottom - top };
}
