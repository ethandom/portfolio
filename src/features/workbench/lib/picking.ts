import { Box3, type Intersection, Vector3 } from "three";
import { type StationId, zoneOf } from "./hits";

/** How far outside its box a surface can be and still count (the wall behind a shelf, a cushion edge). */
const MARGIN = new Vector3(0.06, 0.06, 0.06);
const padded = new Box3();

/** The nearest real surface along the ray (zone boxes are invisible). */
export const solidHit = (hits: Intersection[]) =>
  hits.find((h) => !zoneOf(h.object)) ?? null;

/**
 * The station under the pointer in the overview: the one whose zone box
 * holds the first real surface the ray meets. Not the nearest zone box
 * along the ray: from the corner camera the lounge's box stands in front of
 * the bookshelf's lower half. With nothing solid under the pointer, the
 * nearest zone box along the ray.
 */
export function zoneAt(
  stations: ReadonlyMap<StationId, { box: Box3 }>,
  hits: Intersection[],
): StationId | null {
  const surface = solidHit(hits);
  if (!surface) return hits.map((h) => zoneOf(h.object)).find(Boolean) ?? null;
  for (const [id, { box }] of stations) {
    padded.copy(box).expandByVector(MARGIN);
    if (padded.containsPoint(surface.point)) return id;
  }
  return null;
}
