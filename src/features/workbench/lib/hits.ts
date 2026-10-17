import type { Object3D } from "three";

/** The clickable groups in scene.glb, exported as `Hit_<id>`. */
export const HIT_IDS = [
  "relay",
  "usb",
  "monitor",
  "laptop",
  "pi",
  "mic",
  "mug",
  "chess",
  "frisbee",
  "frame",
  "rack",
  "book",
] as const;

export type HitId = (typeof HIT_IDS)[number];

/** Hover labels. Placeholder copy for the gray-box; later from /content. */
export const HIT_LABELS: Record<HitId, string> = {
  relay: "USB relay board",
  usb: "USB cable",
  monitor: "Terminal",
  laptop: "Skills",
  pi: "Raspberry Pi 4",
  mic: "Microphone",
  mug: "Coffee",
  chess: "Google apprenticeship",
  frisbee: "Ultimate disc",
  frame: "U-20 Worlds",
  rack: "Conturo",
  book: "Now reading",
};

/** The areas the camera can sit at, each with a `Zone_<id>` box. */
export const STATION_IDS = ["workbench", "lounge", "shelf", "rack"] as const;

export type StationId = (typeof STATION_IDS)[number];

export const STATION_LABELS: Record<StationId, string> = {
  workbench: "Workbench",
  lounge: "Lounge",
  shelf: "Bookshelf",
  rack: "Server rack",
};

const includes = <T extends string>(list: readonly T[], value: unknown) =>
  (list as readonly unknown[]).includes(value);

/** The id in a `Hit_<id>` node name, or null for any other name. */
export function hitIdFromName(name: string): HitId | null {
  const id = name.startsWith("Hit_") ? name.slice("Hit_".length) : "";
  return includes(HIT_IDS, id) ? (id as HitId) : null;
}

/** The `Hit_<id>` group an object belongs to, or null for set dressing. */
export function hitIdOf(object: Object3D | null): HitId | null {
  for (let o = object; o; o = o.parent) {
    const id = hitIdFromName(o.name);
    if (id) return id;
  }
  return null;
}

/**
 * The station an object belongs to, from the `station` extra Blender
 * exports onto Hit_ groups and Zone_ boxes (three puts it in userData).
 */
export function stationOf(object: Object3D | null): StationId | null {
  for (let o = object; o; o = o.parent) {
    const station: unknown = o.userData.station;
    if (station !== undefined) {
      return includes(STATION_IDS, station) ? (station as StationId) : null;
    }
  }
  return null;
}

/** The station whose Zone_ box this is, or null for anything else. */
export function zoneOf(object: Object3D): StationId | null {
  return object.name.startsWith("Zone_") ? stationOf(object) : null;
}
