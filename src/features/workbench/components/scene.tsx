"use client";

import {
  type Ref,
  type RefObject,
  useEffect,
  useEffectEvent,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { useGLTF } from "@react-three/drei";
import { type ThreeEvent, useFrame, useThree } from "@react-three/fiber";
import type { PerspectiveCamera } from "three";
import { MathUtils, Vector2, Vector3 } from "three";
import { ACTIONS, ALL_ACTIONS, type ActionContext } from "../lib/actions";
import {
  cloneShot,
  fitVerticalFov,
  projectRect,
  type Rect,
  shotPath,
} from "../lib/framing";
import { HIT_IDS, type HitId, hitIdOf, type StationId } from "../lib/hits";
import { prepareModel, setGlow, warmUp } from "../lib/model";
import { Pacer } from "../lib/pacer";
import { solidHit, zoneAt } from "../lib/picking";
import { bindBoard } from "../lib/relay-board";
import {
  LaptopScreen,
  MonitorScreen,
  readPalette,
  ScopeScreen,
} from "../lib/screens";
import type { Terminal } from "../lib/terminal";
import { easeInOutQuart, Tweens } from "../lib/tweens";
import { MODEL_URL } from "../lib/urls";
import { Lighting } from "./lighting";

/** Seconds. */
const CAMERA_MOVE = 1.2;
/** How far the camera drifts with the pointer, in meters at the edge. */
const PARALLAX = {
  overview: new Vector2(0.08, 0.05),
  station: new Vector2(0.03, 0.02),
};
/**
 * Frames a second while only the bench screens animate (the laptop's 30 is
 * the fastest of them). The Canvas draws on demand: every frame while
 * something moves, at this rate for the screens, otherwise not at all.
 */
const SCREEN_FPS = 30;
/** A frame this long (s) after the one before ends an idle spell: it steps as one frame, not the whole gap. */
const IDLE_GAP = 0.25;
/** The rig's damping snaps to its target this close: pointer units, and meters of parallax (both well under a pixel). */
const SETTLE = { pointer: 1e-3, amplitude: 1e-4 };
/** Milliseconds of BVH building per idle slice. */
const BVH_SLICE = 8;

const settle = (value: number, target: number, within: number) =>
  Math.abs(value - target) < within ? target : value;

/** Runs `step` when the browser is idle (or soon, without requestIdleCallback); returns the cancel. */
function whenIdle(step: () => void) {
  if (typeof requestIdleCallback === "function") {
    const id = requestIdleCallback(step, { timeout: 500 });
    return () => cancelIdleCallback(id);
  }
  const id = setTimeout(step, 16);
  return () => clearTimeout(id);
}

// scene.glb is meshopt-compressed (assets/workbench/build.sh); no Draco.
useGLTF.preload(MODEL_URL, false, true);

export type SceneApi = { act: (id: HitId) => void };

/** The objects at each station, in HIT_IDS order. */
/** The stations the model has, each with its objects in HIT_IDS order. */
export type Layout = Partial<Record<StationId, HitId[]>>;

const drift = new Vector3();
const still = new Vector2();

/** Action bookkeeping. `epoch` bumps on every station change. */
type Bench = { epoch: number; flags: Set<string>; claims: Map<string, symbol> };

function actionContext(
  bench: Bench,
  model: ActionContext["model"],
  tweens: Tweens,
  monitor: MonitorScreen,
  terminal: Terminal,
  reduced: boolean,
): ActionContext {
  return {
    model,
    tweens,
    monitor,
    terminal,
    seconds: (s) => (reduced ? 0 : s),
    flags: bench.flags,
    claim: (key) => {
      const token = Symbol(key);
      const epoch = bench.epoch;
      bench.claims.set(key, token);
      return () => bench.epoch === epoch && bench.claims.get(key) === token;
    },
  };
}

/** Moves and sizes the zone outline, or hides it. */
function place(el: HTMLElement | null, rect: Rect | null | undefined) {
  if (!el) return;
  if (!rect) {
    el.style.display = "none";
    return;
  }
  el.style.display = "block";
  el.style.transform = `translate(${rect.x}px, ${rect.y}px)`;
  el.style.width = `${rect.width}px`;
  el.style.height = `${rect.height}px`;
}

/**
 * The room. In the overview the camera rests on Camera_Main and the zones
 * outline on hover; a zone takes the camera to its station, where objects
 * do things in place. Parallax everywhere, smaller at stations. The bench
 * monitor paints `terminal`, and the relay LEDs follow its mask once the
 * board has booted. The room stays hidden until its textures are up and
 * its shaders compiled (`onReady` then), so the first frame doesn't stall.
 */
export function Scene({
  api,
  terminal,
  station,
  zone,
  highlight,
  reduced,
  outline,
  onHoverZone,
  onHoverHit,
  onGo,
  onReady,
  onAct,
  onArrive,
}: {
  api: Ref<SceneApi>;
  /** The monitor's relayctl session (the app's hidden input types into it). */
  terminal: Terminal;
  station: StationId | null;
  /** The zone to outline (overview only). */
  zone: StationId | null;
  /** The object to glow (at a station). */
  highlight: HitId | null;
  reduced: boolean;
  outline: RefObject<HTMLDivElement | null>;
  onHoverZone: (id: StationId | null) => void;
  onHoverHit: (id: HitId | null) => void;
  /** A zone was clicked (go there) or empty space at a station (null). */
  onGo: (id: StationId | null) => void;
  onReady: (layout: Layout) => void;
  /** An object was clicked or keyed at its station (after its action starts). */
  onAct: (id: HitId) => void;
  /** The camera finished gliding to a station. */
  onArrive: (id: StationId) => void;
}) {
  const { scene } = useGLTF(MODEL_URL, false, true);
  const model = useMemo(() => prepareModel(scene), [scene]);
  const gl = useThree((s) => s.gl);
  const camera = useThree((s) => s.camera);
  const world = useThree((s) => s.scene);
  const invalidate = useThree((s) => s.invalidate);
  const canvas = gl.domElement;
  const [pacer] = useState(() => new Pacer(() => invalidate()));
  const [warm, setWarm] = useState(false);
  const screens = useMemo(() => {
    const palette = readPalette(canvas);
    return {
      monitor: new MonitorScreen(model.screens.monitor, palette, terminal),
      laptop: new LaptopScreen(model.screens.laptop, palette),
      scope: new ScopeScreen(model.screens.scope, palette),
    };
  }, [model, canvas, terminal]);
  const [tweens] = useState(() => new Tweens(() => pacer.now()));
  // Per-frame state: the shot the camera is on (before parallax), the
  // smoothed pointer, and the parallax amplitude easing between modes.
  const rig = useRef({
    shot: cloneShot(model.overview),
    pointer: new Vector2(),
    amplitude: new Vector2(),
  });
  // Runs from before a station change stop at their next check.
  const bench = useRef<Bench>({
    epoch: 0,
    flags: new Set(),
    claims: new Map(),
  });

  useEffect(() => model.dispose, [model]);
  useEffect(() => () => pacer.dispose(), [pacer]);
  // The relay LEDs follow the terminal's mask while it's online.
  useEffect(() => bindBoard(terminal, model.leds.relay), [terminal, model]);
  // A frame for whatever changes the picture outside a tween: a session
  // change (the monitor, the LEDs), a hover glow, the zone outline, the
  // pointer (parallax), reduced motion.
  useEffect(() => terminal.subscribe(() => pacer.now()), [terminal, pacer]);
  useEffect(() => pacer.now(), [pacer, zone, highlight, reduced]);
  useEffect(() => {
    const wake = () => pacer.now();
    window.addEventListener("pointermove", wake, { passive: true });
    return () => window.removeEventListener("pointermove", wake);
  }, [pacer]);

  useEffect(() => {
    let live = true;
    void warmUp(gl, model.root, camera, world).then(() => {
      if (live) setWarm(true);
    });
    return () => {
      live = false;
    };
  }, [gl, model, camera, world]);
  // Once the room shows: the raycast BVH, in idle slices.
  useEffect(() => {
    if (!warm) return;
    let cancel = whenIdle(function step() {
      if (!model.buildBvh(BVH_SLICE)) cancel = whenIdle(step);
    });
    return () => cancel();
  }, [warm, model]);
  useEffect(
    () => () => {
      screens.monitor.dispose();
      screens.laptop.dispose();
      screens.scope.dispose();
    },
    [screens],
  );
  useEffect(() => {
    if (!warm) return;
    const layout: Layout = Object.fromEntries(
      [...model.stations.keys()].map((id) => [id, [] as HitId[]]),
    );
    for (const id of HIT_IDS) {
      const station = model.hits.get(id)?.station;
      if (station) layout[station]?.push(id);
    }
    onReady(layout);
  }, [warm, model, onReady]);

  function act(id: HitId) {
    if (!station || model.hits.get(id)?.station !== station) return;
    const action = ACTIONS[id];
    if (action) {
      void action.play(
        actionContext(
          bench.current,
          model,
          tweens,
          screens.monitor,
          terminal,
          reduced,
        ),
      );
    }
    onAct(id);
  }

  const arrive = useEffectEvent((id: StationId) => onArrive(id));

  useImperativeHandle(api, () => ({ act }));

  useEffect(() => {
    if (!highlight) return;
    const glows = model.glows.get(highlight);
    setGlow(glows, true);
    return () => setGlow(glows, false);
  }, [model, highlight]);

  // Arriving anywhere: put every station back, then glide there.
  useEffect(() => {
    const b = bench.current;
    b.epoch++;
    b.claims.clear();
    const ctx = actionContext(
      b,
      model,
      tweens,
      screens.monitor,
      terminal,
      reduced,
    );
    ALL_ACTIONS.forEach((action) => action.reset(ctx));
    b.flags.clear();
    // Away from the bench the monitor holds still: one repaint shows the reset.
    screens.monitor.stale();

    const { shot } = rig.current;
    const to = station ? model.stations.get(station)?.shot : model.overview;
    if (!to) return;
    const path = shotPath(shot, to);
    const epoch = b.epoch;
    void tweens
      .run("camera", reduced ? 0 : CAMERA_MOVE, (t) =>
        path(shot, easeInOutQuart(t)),
      )
      .then(() => {
        // Stopped tweens resolve too: only a glide that wasn't overtaken.
        if (station && bench.current.epoch === epoch) arrive(station);
      });
  }, [station, model, tweens, reduced, screens, terminal]);

  useFrame((state, delta) => {
    // After an idle spell the clock's delta spans it: step one frame instead.
    const dt = delta > IDLE_GAP ? 1 / 60 : delta;
    const cam = state.camera as PerspectiveCamera;
    const { width, height } = state.size;
    const r = rig.current;
    tweens.tick(dt);

    const fov = fitVerticalFov(r.shot.lens, width / height);
    if (cam.fov !== fov) {
      cam.fov = fov;
      cam.updateProjectionMatrix();
    }

    const amp = reduced
      ? still
      : station
        ? PARALLAX.station
        : PARALLAX.overview;
    const { pointer } = state;
    r.amplitude.x = settle(
      MathUtils.damp(r.amplitude.x, amp.x, 3, dt),
      amp.x,
      SETTLE.amplitude,
    );
    r.amplitude.y = settle(
      MathUtils.damp(r.amplitude.y, amp.y, 3, dt),
      amp.y,
      SETTLE.amplitude,
    );
    if (reduced) r.amplitude.set(0, 0);
    r.pointer.x = settle(
      MathUtils.damp(r.pointer.x, pointer.x, 4, dt),
      pointer.x,
      SETTLE.pointer,
    );
    r.pointer.y = settle(
      MathUtils.damp(r.pointer.y, pointer.y, 4, dt),
      pointer.y,
      SETTLE.pointer,
    );
    drift
      .set(r.pointer.x * r.amplitude.x, r.pointer.y * r.amplitude.y, 0)
      .applyQuaternion(cam.quaternion);
    cam.position.copy(r.shot.position).add(drift);
    cam.lookAt(r.shot.target);
    cam.updateMatrixWorld();

    // The cable follows the plug; the screens repaint at their own rates,
    // only while the camera is at the bench (each paints once otherwise).
    model.cable.update();
    const now = state.clock.elapsedTime;
    for (const screen of [screens.monitor, screens.laptop, screens.scope]) {
      if (station === "workbench" || !screen.painted) screen.tick(now, reduced);
    }

    // Zone outline: the box's projected bounds, written straight to the DOM.
    const corners = station || !zone ? null : model.stations.get(zone)?.corners;
    place(outline.current, corners && projectRect(corners, cam, width, height));

    // The next frame: right away while anything moves, at the screens' rate
    // while only they do.
    const moving =
      tweens.busy ||
      r.pointer.x !== pointer.x ||
      r.pointer.y !== pointer.y ||
      r.amplitude.x !== amp.x ||
      r.amplitude.y !== amp.y;
    if (moving) pacer.now();
    else if (station === "workbench" && !reduced) pacer.within(1 / SCREEN_FPS);
  });

  function hover(e: ThreeEvent<PointerEvent>) {
    e.stopPropagation();
    if (!warm) return;
    if (!station) {
      onHoverZone(zoneAt(model.stations, e.intersections));
      return;
    }
    const id = hitIdOf(solidHit(e.intersections)?.object ?? null);
    onHoverHit(id && model.hits.get(id)?.station === station ? id : null);
  }

  function click(e: ThreeEvent<MouseEvent>) {
    e.stopPropagation();
    if (!warm) return;
    if (!station) {
      const target = zoneAt(model.stations, e.intersections);
      if (target) onGo(target);
      return;
    }
    const id = hitIdOf(solidHit(e.intersections)?.object ?? null);
    if (id && model.hits.get(id)?.station === station) act(id);
    else onGo(null);
  }

  return (
    <>
      <primitive
        object={model.root}
        visible={warm}
        onPointerMove={hover}
        onClick={click}
      />
      <Lighting lights={model.lights} />
    </>
  );
}
