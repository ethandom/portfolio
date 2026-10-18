"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { type ReactNode, useSyncExternalStore } from "react";
import { preload } from "react-dom";
import { Button } from "@/components/ui/button";
import { DUSK } from "../lib/palette";
import type { Panels } from "../lib/panels";
import { MODEL_URL } from "../lib/urls";
import { Loading } from "./loading";

/**
 * Screens that get the scene: the `dock:` variant in globals.css (where the
 * Manual / Workbench switch shows). Phones, upright or sideways, don't.
 */
const ROOMY = "(min-width: 48rem) and (min-height: 32rem)";

type Fit = "ok" | "small" | "no-webgl";

function Backdrop({ children }: { children: ReactNode }) {
  return (
    <div
      data-theme="dark"
      style={{ background: DUSK }}
      className="relative h-dvh w-full text-ink"
    >
      {children}
    </div>
  );
}

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
      <Backdrop>
        <Loading />
      </Backdrop>
    ),
  },
);

// Decided once per page load: a window resized later keeps what it has.
let fit: Fit | undefined;
function measure(): Fit {
  if (fit) return fit;
  if (!window.matchMedia(ROOMY).matches) return (fit = "small");
  const gl = document.createElement("canvas").getContext("webgl2");
  gl?.getExtension("WEBGL_lose_context")?.loseContext();
  return (fit = gl ? "ok" : "no-webgl");
}
const never = () => () => {};

/**
 * `panels`: the 2D overlays' content, rendered by the route from /content
 * (it can compose other features; this one can't import them). On a roomy
 * screen the scene file starts downloading with the page (a preload in its
 * head, which a phone skips by its media query), not once the 3D code has
 * loaded; the loader's fetch picks it up (same CORS mode). A phone, or a
 * browser without WebGL 2, gets a pointer to the Manual instead.
 */
export function Workbench({ panels = {} }: { panels?: Panels }) {
  preload(MODEL_URL, { as: "fetch", crossOrigin: "anonymous", media: ROOMY });
  // The server can't know: it prints the loading screen until the browser decides.
  const verdict = useSyncExternalStore(never, measure, () => null);

  if (verdict === "ok") return <WorkbenchApp panels={panels} />;
  return (
    <Backdrop>
      {verdict ? <Unsupported fit={verdict} /> : <Loading />}
    </Backdrop>
  );
}

function Unsupported({ fit }: { fit: Exclude<Fit, "ok"> }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-5 px-(--gutter) text-center">
      <p className="font-mono text-label text-ink-muted uppercase">Workbench</p>
      <h1 className="max-w-md text-xl font-light text-balance">
        {fit === "small"
          ? "The Workbench is a 3D room built for a bigger screen."
          : "The Workbench is a 3D room, and this browser has WebGL turned off."}
      </h1>
      <p className="max-w-sm text-ink-muted text-balance">
        The Manual has the same work, made for any screen.
      </p>
      <Button asChild size="lg" variant="outline">
        <Link href="/">Read the Manual</Link>
      </Button>
    </div>
  );
}
