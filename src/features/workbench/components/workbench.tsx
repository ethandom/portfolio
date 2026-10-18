"use client";

import dynamic from "next/dynamic";
import { preload } from "react-dom";
import { DUSK } from "../lib/palette";
import type { Panels } from "../lib/panels";
import { MODEL_URL } from "../lib/urls";
import { Loading } from "./loading";

/**
 * three, R3F and the scene load in their own chunk once this mounts, and
 * only in the browser (WebGL has nothing to server-render). `ssr: false`
 * needs a Client Component, hence this wrapper.
 */
const WorkbenchApp = dynamic(
  () => import("./workbench-app").then((m) => m.WorkbenchApp),
  {
    ssr: false,
    loading: () => (
      <div
        data-theme="dark"
        style={{ background: DUSK }}
        className="relative h-dvh w-full"
      >
        <Loading />
      </div>
    ),
  },
);

/**
 * `panels`: the 2D overlays' content, rendered by the route from /content
 * (it can compose other features; this one can't import them). The scene
 * file starts downloading with the page (a preload in its head), not once
 * the 3D code has loaded; the loader's fetch picks it up (same CORS mode).
 */
export function Workbench({ panels = {} }: { panels?: Panels }) {
  preload(MODEL_URL, { as: "fetch", crossOrigin: "anonymous" });
  return <WorkbenchApp panels={panels} />;
}
