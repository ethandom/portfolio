import type { ReactNode } from "react";
import type { HitId, StationId } from "./hits";

/**
 * The 2D overlays: a small panel docked over the scene that carries what a
 * 3D object can't say on its own (copy, a video, a figure).
 */
export const PANEL_IDS = ["reading", "conturo", "skills", "google"] as const;

export type PanelId = (typeof PANEL_IDS)[number];

/**
 * One panel, as the route hands it in: copy from /content, rendered on the
 * server (the Workbench feature never imports another feature).
 */
export type PanelContent = {
  /** Mono label over the title, e.g. "Now reading". */
  kicker: string;
  title: string;
  body: ReactNode;
};

export type Panels = Partial<Record<PanelId, PanelContent>>;

/** The panel a station opens once the camera arrives there. */
export const STATION_PANELS: Partial<Record<StationId, PanelId>> = {
  shelf: "reading",
  rack: "conturo",
};

/** The panel an object opens when it's clicked at its station. */
export const HIT_PANELS: Partial<Record<HitId, PanelId>> = {
  laptop: "skills",
  chess: "google",
  rack: "conturo",
  book: "reading",
};
