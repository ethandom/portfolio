"use client";

import dynamic from "next/dynamic";
import { DUSK } from "../lib/palette";
import type { Panels } from "../lib/panels";
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
 * (it can compose other features; this one can't import them).
 */
export function Workbench({ panels = {} }: { panels?: Panels }) {
  return <WorkbenchApp panels={panels} />;
}
