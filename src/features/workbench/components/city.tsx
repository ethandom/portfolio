"use client";

import { useEffect, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { type Object3D, Texture } from "three";
import { CITY_DIR, CITY_URL, parseCity } from "../lib/city";
import { buildCity, type CityView } from "../lib/city-scene";
import type { Pacer } from "../lib/pacer";

/**
 * Frames a second for the live touches once the city is in: aviation
 * flashes, traffic streaks and window fades read smoothly at 30 from a
 * kilometer off, and the room doesn't redraw at the display's 60 or 120
 * for them.
 */
const LIVE_FPS = 30;

/**
 * A layer image, decoded off the main thread, straight alpha, unflipped
 * (layerUv puts v = 0 at the top).
 */
async function loadLayer(url: string, signal: AbortSignal) {
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  const bitmap = await createImageBitmap(await response.blob(), {
    premultiplyAlpha: "none",
    colorSpaceConversion: "none",
  });
  const texture = new Texture(bitmap);
  texture.flipY = false;
  texture.needsUpdate = true;
  return texture;
}

/** city.json and its layers, as three.js objects; all or nothing. */
async function loadCity(signal: AbortSignal) {
  const response = await fetch(CITY_URL, { signal });
  if (!response.ok) throw new Error(`${CITY_URL}: HTTP ${response.status}`);
  const manifest = parseCity(await response.json());
  const loads = await Promise.allSettled(
    manifest.layers.map((l) => loadLayer(`${CITY_DIR}/${l.file}`, signal)),
  );
  const textures = loads.flatMap((l) =>
    l.status === "fulfilled" ? [l.value] : [],
  );
  const failed = loads.find((l) => l.status === "rejected");
  if (failed) {
    textures.forEach((t) => t.dispose());
    throw failed.reason;
  }
  return buildCity(manifest, textures);
}

/**
 * The city behind the window (lib/city.ts). It loads on mount: the scene
 * mounts it once the room's first frame is drawn, so the room never waits
 * on it and it never shows without the room. It uploads its textures and
 * compiles its shaders before showing, then fades in and takes over from
 * the scene's stand-in `view`. If anything fails, the stand-in stays and
 * one warning says why. It asks `pacer` for frames: every one while it
 * fades in, then LIVE_FPS (none under reduced motion).
 */
export function City({
  view,
  reduced,
  pacer,
}: {
  /** The placeholder skyline in scene.glb, hidden while the city is up. */
  view: Object3D | null;
  reduced: boolean;
  pacer: Pacer;
}) {
  const gl = useThree((s) => s.gl);
  const camera = useThree((s) => s.camera);
  const scene = useThree((s) => s.scene);
  const [city, setCity] = useState<CityView | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    let built: CityView | null = null;
    loadCity(controller.signal)
      .then(async (c) => {
        if (controller.signal.aborted) return c.dispose();
        built = c;
        await c.prepare(gl, camera, scene);
        if (!controller.signal.aborted) setCity(c);
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        built?.dispose();
        built = null;
        console.warn("Workbench: keeping the placeholder skyline.", error);
      });
    return () => {
      controller.abort();
      built?.dispose();
      setCity(null);
    };
  }, [gl, camera, scene]);

  // Takes over from the stand-in from the city's first frame.
  useEffect(
    () => (city && view ? city.replace(view) : undefined),
    [city, view],
  );
  useEffect(() => {
    if (city) pacer.now();
  }, [city, pacer]);

  useFrame((state, dt) => {
    if (!city) return;
    if (city.tick(dt, state.gl, reduced)) pacer.now();
    else if (!reduced) pacer.within(1 / LIVE_FPS);
  });

  return city ? <primitive object={city.root} /> : null;
}
