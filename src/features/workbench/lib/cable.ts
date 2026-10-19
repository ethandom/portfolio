import {
  CatmullRomCurve3,
  Mesh,
  MeshStandardMaterial,
  type Object3D,
  TubeGeometry,
  Vector3,
} from "three";

/** Cable length over the first start-to-plug distance: the slack. */
const SLACK = 1.12;
/** The cable leaves the plug straight for this long (m). */
const LEAD = 0.035;
/** Which side of the start-to-plug line the slack loops to (+1 or -1). */
const SIDE = -1;
/** Fits inside the plug's strain relief (usb_plug.glb at the boards' 1.25x). */
const RADIUS = 0.0028;
const SEGMENTS = 64;
const UP = new Vector3(0, 1, 0);

/**
 * Points for a cable lying on the bench: from `start` to `end`, leaving
 * the plug straight back along `exit`, with the slack of a fixed `length`
 * looped out sideways in a sine. Pull the plug farther away and the loop
 * tightens; past the length it runs straight.
 */
export function cablePoints(
  start: Vector3,
  end: Vector3,
  exit: Vector3,
  length: number,
  side = SIDE,
) {
  const lead = end.clone().addScaledVector(exit, LEAD);
  const chord = lead.clone().sub(start);
  const span = chord.length();
  // A sine loop of amplitude a over span c is about c + (πa)²/4c long.
  const amp =
    length > span ? (2 / Math.PI) * Math.sqrt(span * (length - span)) : 0;
  const across = chord.clone().cross(UP).setY(0).normalize();
  const points: Vector3[] = [];
  const n = 8;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    points.push(
      start
        .clone()
        .addScaledVector(chord, t)
        .addScaledVector(across, side * amp * Math.sin(Math.PI * t)),
    );
  }
  points.push(end.clone());
  return points;
}

/**
 * The USB cable as a tube from its fixed end to the back of the plug,
 * rebuilt whenever the plug moves. It hangs under `parent` (Hit_usb), so
 * it hovers and glows with the cable.
 */
export class Cable {
  readonly mesh: Mesh<TubeGeometry, MeshStandardMaterial>;
  private length: number;
  private last = new Vector3(Infinity, 0, 0);
  private end = new Vector3();
  private exit = new Vector3();

  constructor(
    private start: Vector3,
    private plug: Object3D,
    /** The plug's back face, in the plug's local space. */
    private back: Vector3,
    private parent: Object3D,
    color: string,
  ) {
    this.mesh = new Mesh(
      new TubeGeometry(),
      new MeshStandardMaterial({ color, roughness: 0.6 }),
    );
    this.mesh.name = "USB_Cable_Tube";
    parent.add(this.mesh);
    const from = plug.getWorldPosition(new Vector3());
    this.length = start.distanceTo(from) * SLACK;
    this.update();
  }

  update() {
    this.plug.updateWorldMatrix(true, false);
    this.end.copy(this.back).applyMatrix4(this.plug.matrixWorld);
    if (this.end.distanceToSquared(this.last) < 1e-10) return;
    this.last.copy(this.end);
    this.exit.set(-1, 0, 0).transformDirection(this.plug.matrixWorld);
    const world = cablePoints(this.start, this.end, this.exit, this.length);
    const local = world.map((p) => this.parent.worldToLocal(p));
    const curve = new CatmullRomCurve3(local, false, "centripetal");
    this.mesh.geometry.dispose();
    this.mesh.geometry = new TubeGeometry(curve, SEGMENTS, RADIUS, 6);
  }

  /**
   * GPU resources only, the tube stays in the tree: dev Strict Mode
   * replays the effect that calls this and keeps drawing the model, and
   * three uploads them again at their next draw.
   */
  dispose() {
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
  }
}
