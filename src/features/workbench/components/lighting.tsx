"use client";

import { useMemo } from "react";
import { Environment, Lightformer } from "@react-three/drei";
import { Object3D } from "three";
import type { WorkbenchModel } from "../lib/model";
import { DUSK } from "../lib/palette";

/** Gray-box dusk. Every value here is a first guess, meant to be tuned. */
const SKY = "#9fb2e6";
const FLOOR = "#7a5a3e";
const BULB = "#ffc37a";
const STRIP = "#ffc98a";
const MOONLIGHT = "#a9bcff";
/** Point lights standing in for the LED strip under the bench shelf. */
const STRIP_LIGHTS = 3;

/**
 * Cool sky over a warm floor; warm bulbs and LED strips (physical units:
 * candela, inverse-square falloff); a weak cool light through the window.
 * The window wall is at -Z, and a directional light aims at the origin (by
 * the near wall), so it sits out past the glass.
 */
export function Lighting({ lights }: { lights: WorkbenchModel["lights"] }) {
  const { lamp, lampTarget, pendant, strip, shelf } = lights;
  const step = strip.length / STRIP_LIGHTS;
  // A spot's target has to be in the scene for its matrix to update.
  const target = useMemo(() => {
    const o = new Object3D();
    o.position.copy(lampTarget);
    return o;
  }, [lampTarget]);
  return (
    <>
      <color attach="background" args={[DUSK]} />
      {/*
        Reflections for metal (CAD ports, tools, lamps): a small cube map
        rendered from two light cards, so there's no HDR to download.
        The window card sits out past the glass (-Z); the warm one is the pendant.
      */}
      <Environment resolution={128} environmentIntensity={0.35}>
        <color attach="background" args={[DUSK]} />
        <Lightformer
          form="rect"
          color={MOONLIGHT}
          intensity={2}
          position={[0, 1.6, -7]}
          scale={[10, 3, 1]}
        />
        <Lightformer
          form="rect"
          color={BULB}
          intensity={3}
          position={[pendant.x, pendant.y + 0.4, pendant.z]}
          rotation-x={Math.PI / 2}
          scale={[1.2, 1.2, 1]}
        />
      </Environment>
      <hemisphereLight args={[SKY, FLOOR, 0.6]} />
      {/* The clamp lamp: a soft pool on the project tray, a little glow around the head. */}
      <primitive object={target} />
      <spotLight
        position={lamp}
        target={target}
        color={BULB}
        intensity={2.5}
        angle={0.75}
        penumbra={0.9}
      />
      <pointLight
        position={[lamp.x, lamp.y - 0.03, lamp.z]}
        color={BULB}
        intensity={0.15}
      />
      <pointLight position={pendant} color={BULB} intensity={4} />
      {Array.from({ length: STRIP_LIGHTS }, (_, i) => (
        <pointLight
          key={i}
          position={[
            strip.center.x - strip.length / 2 + step * (i + 0.5),
            strip.center.y - 0.03,
            strip.center.z,
          ]}
          color={STRIP}
          intensity={0.3}
        />
      ))}
      <pointLight
        position={[shelf.x - 0.15, shelf.y, shelf.z]}
        color={STRIP}
        intensity={0.5}
      />
      <directionalLight
        position={[0.5, 3.5, -10]}
        color={MOONLIGHT}
        intensity={0.4}
      />
    </>
  );
}
