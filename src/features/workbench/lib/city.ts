import {
  BufferGeometry,
  Float32BufferAttribute,
  MathUtils,
  Vector3,
} from "three";
import { z } from "zod";

/**
 * The view out of the window: image layers on cylinder segments around the
 * eye, plus live touches the app draws over them. Written by the city build;
 * the contract is assets/workbench/city/README.md.
 */
export const CITY_DIR = "/workbench/city";
export const CITY_URL = `${CITY_DIR}/city.json`;

/**
 * How far from the eye any of it may reach (m): inside the camera's far
 * plane (5000 m, workbench-app.tsx), with room for the cameras' few meters
 * from the eye.
 */
export const MAX_DISTANCE = 4900;

/** A live touch sits at least this far (m) off every layer's cylinder, so it never shares a depth with one. */
const CLEARANCE = 1;

/**
 * A geometry column (and, for equirect, a row) every this many degrees.
 * At 1.6 km a 1° chord bows 6 cm in from the arc.
 */
const STEP = 1;

const DEG = MathUtils.DEG2RAD;

const azimuth = z.number().min(-180).max(180);
/** tan(el) runs off to infinity at ±90°. */
const elevation = z.number().gt(-85).lt(85);
const range = (n: z.ZodNumber) =>
  z.tuple([n, n]).refine(([lo, hi]) => lo < hi, "expected [low, high]");
const radius = z.number().positive().max(MAX_DISTANCE);
/** A bare file name next to city.json: no folders, no way out of it. */
const file = z
  .string()
  .regex(
    /^[\w-][\w.-]*\.(webp|png|jpe?g|avif)$/,
    "expected an image file name next to city.json",
  );

const layerSchema = z.object({
  id: z.string().regex(/^[\w-]+$/),
  file,
  projection: z.enum(["cylindrical", "equirect"]),
  radius,
  az: range(azimuth),
  el: range(elevation),
  alpha: z.boolean(),
});

const aviationSchema = z.object({
  az: azimuth,
  el: elevation,
  r: radius,
  /** Where in its flash cycle the light starts, 0..1 (wraps). */
  phase: z.number(),
});

const trafficSchema = z.object({
  points: z.array(z.tuple([azimuth, elevation])).min(2),
  r: radius,
  kind: z.enum(["head", "tail"]),
  /** +1 runs along the points, −1 against them. */
  dir: z.union([z.literal(1), z.literal(-1)]),
});

const windowSchema = z.object({
  az: range(azimuth),
  el: range(elevation),
  r: radius,
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "expected #rrggbb"),
});

/** The farthest a point at this radius and elevation band gets from the eye. */
const reach = (r: number, el: readonly number[]) =>
  r / Math.cos(Math.max(...el.map(Math.abs)) * DEG);

const overlaps = (a: readonly number[], b: readonly number[]) =>
  a[0] < b[1] && b[0] < a[1];

export const cityManifest = z
  .object({
    version: z.literal(1),
    /** True only for the runtime's stand-in files. */
    placeholder: z.boolean().default(false),
    credit: z.string().min(1),
    /** The panorama's center, three.js room coordinates. */
    eye: z.tuple([z.number(), z.number(), z.number()]),
    /** Back to front. */
    layers: z.array(layerSchema).min(1).max(4),
    aviation: z.array(aviationSchema).default([]),
    traffic: z.array(trafficSchema).default([]),
    windows: z.array(windowSchema).default([]),
  })
  .superRefine((city, ctx) => {
    const { layers } = city;
    // Zod runs this even when `layers` already failed its .min(1).
    if (!layers.length) return;
    const issue = (path: (string | number)[], message: string) =>
      ctx.addIssue({ code: "custom", path, message });

    layers.forEach((layer, i) => {
      if (layers.findIndex((l) => l.id === layer.id) !== i) {
        issue(["layers", i, "id"], `duplicate layer id ${layer.id}`);
      }
      if (layers.findIndex((l) => l.file === layer.file) !== i) {
        issue(["layers", i, "file"], `${layer.file} is used twice`);
      }
      if (reach(layer.radius, layer.el) > MAX_DISTANCE) {
        issue(["layers", i, "el"], "reaches past the camera's far plane");
      }
      // Back to front: a layer never stands behind one drawn before it,
      // and two that cover the same sky can't share a cylinder (z-fight).
      layers.slice(0, i).forEach((back) => {
        if (layer.radius > back.radius) {
          issue(["layers", i, "radius"], `is behind layer ${back.id}`);
        } else if (
          layer.radius === back.radius &&
          overlaps(layer.az, back.az) &&
          overlaps(layer.el, back.el)
        ) {
          issue(
            ["layers", i, "radius"],
            `overlaps layer ${back.id} on the same cylinder`,
          );
        }
      });
    });

    const far = layers[0].radius;
    const touch = (path: (string | number)[], r: number, el: number[]) => {
      if (r >= far) {
        issue([...path, "r"], `must be inside the far layer (${far} m)`);
      }
      const near = layers.find((l) => Math.abs(l.radius - r) < CLEARANCE);
      if (near) {
        issue(
          [...path, "r"],
          `sits on layer ${near.id}'s cylinder; move it in`,
        );
      }
      if (reach(r, el) > MAX_DISTANCE) {
        issue(path, "reaches past the camera's far plane");
      }
    };
    city.aviation.forEach((a, i) => touch(["aviation", i], a.r, [a.el]));
    city.windows.forEach((w, i) => touch(["windows", i], w.r, w.el));
    city.traffic.forEach((t, i) => {
      touch(
        ["traffic", i],
        t.r,
        t.points.map(([, el]) => el),
      );
      if (trackLength(t.points, t.r) <= 0) {
        issue(["traffic", i, "points"], "has no length");
      }
    });
  });

export type CityManifest = z.infer<typeof cityManifest>;
export type CityLayer = CityManifest["layers"][number];
export type Aviation = CityManifest["aviation"][number];
export type Traffic = CityManifest["traffic"][number];
export type CityWindow = CityManifest["windows"][number];

/** Validates city.json; throws with every bad field. */
export function parseCity(json: unknown): CityManifest {
  const result = cityManifest.safeParse(json);
  if (!result.success) {
    throw new Error(`Invalid city.json:\n${z.prettifyError(result.error)}`);
  }
  return result.data;
}

/**
 * A point on the panorama, relative to the eye (three.js meters): azimuth
 * and elevation in degrees (0 = room forward / the horizon, + = right / up)
 * at radius `r` from the eye's vertical axis. Height goes with tan(el), so
 * the point sits on a vertical cylinder.
 */
export function cityPoint(
  az: number,
  el: number,
  r: number,
  out = new Vector3(),
) {
  const a = az * DEG;
  return out.set(r * Math.sin(a), r * Math.tan(el * DEG), -r * Math.cos(a));
}

/**
 * Where a direction lands in a layer's image: u 0..1 left to right, v 0..1
 * top to bottom (textures load unflipped, as glTF's do). x is linear in
 * azimuth; y is linear in tan(el) (cylindrical) or in el (equirect).
 */
export function layerUv(
  layer: Pick<CityLayer, "az" | "el" | "projection">,
  az: number,
  el: number,
): [number, number] {
  const [az0, az1] = layer.az;
  const y = (e: number) =>
    layer.projection === "cylindrical" ? Math.tan(e * DEG) : e;
  const [bottom, top] = layer.el.map(y);
  return [(az - az0) / (az1 - az0), (top - y(el)) / (top - bottom)];
}

/**
 * A layer's surface: an open cylinder segment around the eye, its faces
 * toward the eye. A column every STEP degrees; rows only for equirect
 * (cylindrical images are linear in height, so top and bottom suffice).
 */
export function layerGeometry(
  layer: Pick<CityLayer, "az" | "el" | "projection" | "radius">,
) {
  const [az0, az1] = layer.az;
  const [el0, el1] = layer.el;
  const columns = Math.max(1, Math.ceil((az1 - az0) / STEP));
  const rows =
    layer.projection === "cylindrical"
      ? 1
      : Math.max(1, Math.ceil((el1 - el0) / STEP));
  const positions: number[] = [];
  const uvs: number[] = [];
  const index: number[] = [];
  const p = new Vector3();
  for (let j = 0; j <= rows; j++) {
    const el = el1 - ((el1 - el0) * j) / rows;
    for (let i = 0; i <= columns; i++) {
      const az = az0 + ((az1 - az0) * i) / columns;
      cityPoint(az, el, layer.radius, p);
      positions.push(p.x, p.y, p.z);
      uvs.push(...layerUv(layer, az, el));
    }
  }
  // Counterclockwise seen from the eye: left to right, bottom to top.
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < columns; i++) {
      const tl = j * (columns + 1) + i;
      const bl = tl + columns + 1;
      index.push(bl, bl + 1, tl + 1, bl, tl + 1, tl);
    }
  }
  const geometry = new BufferGeometry();
  geometry.setIndex(index);
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new Float32BufferAttribute(uvs, 2));
  geometry.computeBoundingSphere();
  return geometry;
}

/**
 * The city draws before the room's own see-through parts (renderOrder 0),
 * back to front: layer i, then the live touches between it and the next
 * layer in, then layer i + 1.
 */
const CITY_ORDER = -100;
export const layerOrder = (i: number) => CITY_ORDER + 2 * i;
export const touchOrder = (slot: number) => CITY_ORDER + 2 * slot + 1;

/** The last layer behind a live touch at radius r: it draws right after that layer. */
export function slotOf(
  layers: readonly Pick<CityLayer, "radius">[],
  r: number,
) {
  let slot = 0;
  layers.forEach((layer, i) => {
    if (layer.radius > r) slot = i;
  });
  return slot;
}

/** A polyline unrolled flat off its cylinder (m): x = r·az, y = r·tan(el). */
const unroll = (points: readonly (readonly number[])[], r: number) =>
  points.map(([az, el]) => [r * az * DEG, r * Math.tan(el * DEG)]);

/** A polyline's length along its cylinder (m). */
export function trackLength(points: readonly (readonly number[])[], r: number) {
  const flat = unroll(points, r);
  let length = 0;
  for (let i = 1; i < flat.length; i++) {
    length += Math.hypot(
      flat[i][0] - flat[i - 1][0],
      flat[i][1] - flat[i - 1][1],
    );
  }
  return length;
}

/**
 * A polyline resampled at `count` points evenly spaced along its cylinder,
 * relative to the eye: xyz plus a spare 0 each (an RGBA texel), and its
 * length in meters.
 */
export function resampleTrack(
  points: readonly (readonly number[])[],
  r: number,
  count: number,
) {
  const flat = unroll(points, r);
  const along = [0];
  for (let i = 1; i < flat.length; i++) {
    along.push(
      along[i - 1] +
        Math.hypot(flat[i][0] - flat[i - 1][0], flat[i][1] - flat[i - 1][1]),
    );
  }
  const length = along[along.length - 1];
  const samples = new Float32Array(count * 4);
  let segment = 1;
  for (let k = 0; k < count; k++) {
    const s = (length * k) / Math.max(1, count - 1);
    while (segment < flat.length - 1 && along[segment] < s) segment++;
    const [a, b] = [flat[segment - 1], flat[segment]];
    const span = along[segment] - along[segment - 1];
    const t = span > 0 ? (s - along[segment - 1]) / span : 0;
    const x = a[0] + (b[0] - a[0]) * t;
    const y = a[1] + (b[1] - a[1]) * t;
    samples.set([r * Math.sin(x / r), y, -r * Math.cos(x / r), 0], k * 4);
  }
  return { samples, length };
}

/** Deterministic noise in [0, 1) for an integer and a salt (lowbias32). */
export function noise(n: number, salt = 0) {
  let h =
    (Math.imul(n | 0, 0x9e3779b9) ^
      Math.imul((salt | 0) + 0x7f4a7c15, 0x85ebca6b)) >>>
    0;
  h ^= h >>> 16;
  h = Math.imul(h, 0x7feb352d);
  h ^= h >>> 15;
  h = Math.imul(h, 0x846ca68b);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
