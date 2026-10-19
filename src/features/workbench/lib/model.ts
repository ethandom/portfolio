import {
  AdditiveBlending,
  Box3,
  type Camera,
  CanvasTexture,
  Color,
  DataTexture,
  type Material,
  Mesh,
  MeshStandardMaterial,
  type Object3D,
  PerspectiveCamera,
  Quaternion,
  RGBAFormat,
  Scene,
  Sprite,
  SpriteMaterial,
  Texture,
  Vector3,
  Vector4,
  type WebGLRenderer,
} from "three";
import { acceleratedRaycast, CENTER, computeBoundsTree } from "three-mesh-bvh";
import { Cable } from "./cable";
import { horizontalFov, type Shot } from "./framing";
import {
  type HitId,
  hitIdFromName,
  type StationId,
  STATION_IDS,
  stationOf,
} from "./hits";
import { Outlines } from "./outlines";
import { HIT_PANELS } from "./panels";

/** Hover tint: emissive pushed toward signal orange. */
const GLOW_COLOR = new Color("#ff4f00");
const GLOW_STRENGTH = 0.045;
/** The cable tube: graphite, like the stand-in segments it replaces. */
const CABLE_COLOR = "#2a2826";

/** A material's own emissive, kept so the hover tint can be undone. */
type Glow = { material: MeshStandardMaterial; color: Color; intensity: number };

/** A screen quad (local +Z faces out) and its size in meters. */
export type ScreenQuad = { mesh: Mesh; width: number; height: number };

export type Station = {
  shot: Shot;
  /** The Zone_ box's eight corners, world space, for the hover outline. */
  corners: Vector3[];
  /** The same box as world bounds, for picking (lib/picking.ts). */
  box: Box3;
};

export type WorkbenchModel = {
  root: Object3D;
  /** The stand-in skyline (`View`), until the city replaces it (components/city.tsx). */
  view: Object3D | null;
  /** Camera_Main looking at Cam_Target. */
  overview: Shot;
  stations: Map<StationId, Station>;
  /** Each Hit_ group and the station it belongs to. */
  hits: Map<HitId, { group: Object3D; station: StationId }>;
  glows: Map<HitId, Glow[]>;
  /** The lines around the objects at a station that open a panel. */
  outlines: Outlines;
  /** USB_Plug and its two local positions: on the bench, and in USB_Port. */
  plug: { object: Object3D; home: Vector3; docked: Vector3 };
  cable: Cable;
  screens: { monitor: ScreenQuad; laptop: ScreenQuad; scope: ScreenQuad };
  /** LED materials (this model's own copies) and their lit intensity. */
  /** Relay channel LEDs in channel order (LED_1 = channel 0), and the Pi's activity LED. */
  leds: { relay: MeshStandardMaterial[]; pi: MeshStandardMaterial };
  /**
   * Builds the raycast BVH a slice at a time (see bvhBuilder): for up to
   * `budget` ms, all of it without one. True once every mesh has its tree.
   */
  buildBvh: (budget?: number) => boolean;
  /** Light positions, world space. */
  lights: {
    lamp: Vector3;
    /** Where the desk lamp's head points: the project tray. */
    lampTarget: Vector3;
    pendant: Vector3;
    strip: { center: Vector3; length: number };
    shelf: Vector3;
  };
  dispose: () => void;
};

type Home = { position: Vector3; quaternion: Quaternion; scale: Vector3 };
const homes = new WeakMap<Object3D, Home>();

/** Puts an object back where the export had it. */
export function restore(object: Object3D) {
  const home = homes.get(object);
  if (!home) return;
  object.position.copy(home.position);
  object.quaternion.copy(home.quaternion);
  object.scale.copy(home.scale);
}

/** Where the export had an object (actions animate relative to it). */
export function homeOf(object: Object3D): Home {
  const home = homes.get(object);
  if (!home) throw new Error(`No home recorded for ${object.name}`);
  return home;
}

function need(root: Object3D, name: string) {
  const object = root.getObjectByName(name);
  if (!object) throw new Error(`scene.glb: no node named ${name}`);
  return object;
}

function needMesh(root: Object3D, name: string) {
  const object = need(root, name);
  if (!(object instanceof Mesh)) {
    throw new Error(`scene.glb: ${name} is not a mesh`);
  }
  return object;
}

const noRaycast = () => {};

function shot(root: Object3D, camera: string, target: string): Shot {
  let lens: PerspectiveCamera | undefined;
  need(root, camera).traverse((o) => {
    if (!lens && o instanceof PerspectiveCamera) lens = o;
  });
  if (!lens) throw new Error(`scene.glb: ${camera} is not a camera`);
  return {
    position: lens.getWorldPosition(new Vector3()),
    target: need(root, target).getWorldPosition(new Vector3()),
    lens: { vfov: lens.fov, hfov: horizontalFov(lens.fov, lens.aspect) },
  };
}

/**
 * Raycasts through a BVH. The set dressing ships merged (Static_* meshes,
 * one per region), and a plain raycast tests every triangle of every mesh
 * whose bounds the ray crosses: ~9 ms a pointer move at the bench. CENTER
 * builds the whole scene in ~150 ms, so the scene builds it in idle slices
 * after its first frame; a mesh keeps the plain (slower, same) raycast
 * until its tree is in. The trees stay on the cached geometry, so a
 * re-prepared model reuses them. Meshes that already opt out of raycasts
 * are left alone.
 */
function bvhBuilder(root: Object3D) {
  const queue: Mesh[] = [];
  root.traverse((o) => {
    if (o instanceof Mesh && o.raycast === Mesh.prototype.raycast) {
      queue.push(o);
    }
  });
  // Building a tree reorders its geometry's index in place, and the export's
  // dedup makes same-topology meshes (the zone boxes, matching chess pieces)
  // share one index: each build scrambled the trees built before it, and
  // hovers missed. So a geometry gets its own index before its tree.
  const indices = new Set<unknown>();
  let next = 0;
  return (budget = Infinity) => {
    const start = performance.now();
    while (next < queue.length) {
      const o = queue[next++];
      const geometry = o.geometry;
      if (!geometry.boundsTree) {
        if (geometry.index && indices.has(geometry.index)) {
          geometry.setIndex(geometry.index.clone());
        }
        computeBoundsTree.call(geometry, { strategy: CENTER });
      }
      if (geometry.index) indices.add(geometry.index);
      o.raycast = acceleratedRaycast;
      if (performance.now() - start >= budget) break;
    }
    return next >= queue.length;
  };
}

/** Milliseconds of texture uploads between yields while warming up. */
const UPLOAD_SLICE = 12;
/**
 * Meshes drawn per task in warmUp's first draws. Fixed: a batch that came
 * back quick says nothing about the next one's pipelines (growing the
 * batches after quick ones made a 0.4 s task on a cold cache).
 */
const DRAW_BATCH = 6;

/** The next task, without setTimeout's 4 ms clamp once calls nest. */
const nextTask = () =>
  new Promise<void>((resolve) => {
    const channel = new MessageChannel();
    channel.port1.onmessage = () => resolve();
    channel.port2.postMessage(null);
  });

/**
 * Readies a subtree before it shows, so its first frame doesn't stall:
 * uploads its textures a slice at a time between tasks, compiles its
 * shaders in parallel where the browser can (compileAsync,
 * KHR_parallel_shader_compile), lit by `scene`'s lights, then draws it
 * once, a few meshes a task. That last step matters on a cold shader
 * cache: the GPU still builds each pipeline, and uploads each mesh's
 * buffers, at its first draw (1.2 s in one task for the room on an M4 Pro,
 * Metal). The draws land in one scissored pixel, and each batch ends with
 * the background drawn alone, so the canvas shows nothing else meanwhile.
 * Each batch hides, draws and puts back within its task: a frame or an
 * overlapping call never sees the subtree half hidden. Stops between steps
 * once `signal` aborts (an effect cleaned up), so a stale run never draws
 * over a frame that shows the room. Screen canvases upload when they first
 * paint.
 */
export async function warmUp(
  renderer: WebGLRenderer,
  root: Object3D,
  camera: Camera,
  scene: Scene,
  signal?: AbortSignal,
) {
  const textures = new Set<Texture>();
  const drawables: Object3D[] = [];
  root.traverse((o) => {
    if (!(o instanceof Mesh || o instanceof Sprite)) return;
    for (const m of [o.material].flat() as Material[]) {
      for (const value of Object.values(m)) {
        if (value instanceof Texture && !(value instanceof CanvasTexture)) {
          textures.add(value);
        }
      }
    }
    // Only what a frame would draw: shown, under shown parents (the root aside).
    for (let p: Object3D | null = o; p && p !== root; p = p.parent) {
      if (!p.visible) return;
    }
    drawables.push(o);
  });
  let start = performance.now();
  for (const texture of textures) {
    if (signal?.aborted) return;
    renderer.initTexture(texture);
    if (performance.now() - start < UPLOAD_SLICE) continue;
    await nextTask();
    start = performance.now();
  }
  if (signal?.aborted) return;
  await renderer.compileAsync(root, camera, scene);

  // Draws `scene`'s background and nothing else.
  const backdrop = new Scene();
  for (let i = 0; i < drawables.length; i += DRAW_BATCH) {
    if (signal?.aborted) return;
    const batch = new Set(drawables.slice(i, i + DRAW_BATCH));
    const saved = drawables.map((o) => [o.visible, o.frustumCulled] as const);
    const shown = root.visible;
    const scissor = renderer.getScissor(new Vector4());
    const scissorTest = renderer.getScissorTest();
    try {
      for (const o of drawables) o.visible = batch.has(o);
      for (const o of batch) o.frustumCulled = false;
      root.visible = true;
      renderer.setScissorTest(true);
      renderer.setScissor(0, 0, 1, 1);
      renderer.render(scene, camera);
    } finally {
      renderer.setScissorTest(scissorTest);
      renderer.setScissor(scissor);
      drawables.forEach((o, k) => {
        [o.visible, o.frustumCulled] = saved[k];
      });
      root.visible = shown;
    }
    backdrop.background = scene.background;
    renderer.render(backdrop, camera);
    await nextTask();
  }
}

/**
 * Resolves once the GPU has run every command issued so far: a fence,
 * checked once a frame (WebGL updates its status between tasks only). Also
 * resolves if the context is lost or `signal` aborts, and at once without
 * fences (WebGL 1).
 */
export function gpuDone(renderer: WebGLRenderer, signal?: AbortSignal) {
  const gl = renderer.getContext();
  if (!("fenceSync" in gl)) return Promise.resolve();
  const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
  if (!sync) return Promise.resolve();
  gl.flush();
  return new Promise<void>((resolve) => {
    const check = () => {
      const done =
        signal?.aborted ||
        gl.isContextLost() ||
        gl.getSyncParameter(sync, gl.SYNC_STATUS) === gl.SIGNALED;
      if (!done) return void requestAnimationFrame(check);
      gl.deleteSync(sync);
      resolve();
    };
    requestAnimationFrame(check);
  });
}

/**
 * A screen's size in meters. The export quantizes positions (meshopt), so
 * the geometry is normalized to about ±1 and the node's scale carries the
 * size: the local box times the world scale.
 */
function quad(mesh: Mesh): ScreenQuad {
  mesh.geometry.computeBoundingBox();
  const size = (mesh.geometry.boundingBox ?? new Box3()).getSize(new Vector3());
  const scale = mesh.getWorldScale(new Vector3());
  return {
    mesh,
    width: size.x * Math.abs(scale.x),
    height: size.y * Math.abs(scale.y),
  };
}

/**
 * Copies the loaded scene (useGLTF caches the original) and readies it:
 * per-group material copies so a hover tint or an LED stays on its own
 * object, invisible zone boxes, the cable tube in place of its stand-ins,
 * and the named anchors the cameras and actions use.
 */
export function prepareModel(source: Object3D): WorkbenchModel {
  const root = source.clone(true);
  root.updateMatrixWorld(true);
  const owned: Material[] = [];

  // The skyline sits behind glass nothing can click through.
  const view = root.getObjectByName("View") ?? null;
  view?.traverse((o) => {
    o.raycast = noRaycast;
  });

  // See-through parts (the rack's acrylic plates) don't write depth: their
  // overlapping faces would otherwise sort differently as the camera
  // drifts, and flicker.
  root.traverse((o) => {
    if (!(o instanceof Mesh)) return;
    for (const m of [o.material].flat() as Material[]) {
      if (m.transparent) m.depthWrite = false;
    }
  });

  // Zones: never drawn (not even a depth-tested pass), still hit by the
  // raycaster, which ignores visibility.
  const stations = new Map<StationId, Station>();
  for (const id of STATION_IDS) {
    // A station the build doesn't have yet is left out (model.test.ts
    // asserts every one), so the app runs on an older scene.glb.
    if (!root.getObjectByName(`Zone_${id}`)) continue;
    const zone = needMesh(root, `Zone_${id}`);
    zone.visible = false;
    zone.geometry.computeBoundingBox();
    const { min, max } = zone.geometry.boundingBox ?? new Box3();
    const corners = [0, 1, 2, 3, 4, 5, 6, 7].map((i) =>
      new Vector3(
        i & 1 ? max.x : min.x,
        i & 2 ? max.y : min.y,
        i & 4 ? max.z : min.z,
      ).applyMatrix4(zone.matrixWorld),
    );
    stations.set(id, {
      shot: shot(root, `Camera_${id}`, `Cam_Target_${id}`),
      corners,
      box: new Box3().setFromPoints(corners),
    });
  }

  // The stand-in cable segments give way to the tube below.
  root.traverse((o) => {
    if (/^USB_Cable_\d+$/.test(o.name)) {
      o.visible = false;
      o.raycast = noRaycast;
    }
  });

  const hits = new Map<HitId, { group: Object3D; station: StationId }>();
  const glows = new Map<HitId, Glow[]>();
  root.traverse((group) => {
    const id = hitIdFromName(group.name);
    const station = stationOf(group);
    if (!id || !station) return;
    const copies = new Map<Material, Material>();
    const copy = (m: Material) => {
      let c = copies.get(m);
      if (!c) {
        c = m.clone();
        copies.set(m, c);
        owned.push(c);
      }
      return c;
    };
    group.traverse((o) => {
      homes.set(o, {
        position: o.position.clone(),
        quaternion: o.quaternion.clone(),
        scale: o.scale.clone(),
      });
      if (o instanceof Mesh) {
        o.material = Array.isArray(o.material)
          ? o.material.map(copy)
          : copy(o.material);
      }
    });
    hits.set(id, { group, station });
    // Lit parts (LEDs, screens) keep their own emissive for actions.
    glows.set(
      id,
      [...copies.values()]
        .filter((m) => m instanceof MeshStandardMaterial)
        .filter((m) => m.emissive.getHex() === 0)
        .map((material) => ({
          material,
          color: material.emissive.clone(),
          intensity: material.emissiveIntensity,
        })),
    );
  });

  // Before the cable tube joins the tree: it rebuilds its geometry as the
  // plug moves, so it keeps the plain raycast.
  const buildBvh = bvhBuilder(root);

  const plugObject = need(root, "USB_Plug");
  const port = need(root, "USB_Port").getWorldPosition(new Vector3());
  const plug = {
    object: plugObject,
    home: plugObject.position.clone(),
    docked: plugObject.parent ? plugObject.parent.worldToLocal(port) : port,
  };
  // Where the cable leaves the plug: the body's back end on its axis (its
  // local X), in the plug's space whatever sits between them.
  const body = needMesh(root, "USB_Plug_Body");
  body.geometry.computeBoundingBox();
  const back = plugObject.worldToLocal(
    body.localToWorld(new Vector3(body.geometry.boundingBox?.min.x ?? 0, 0, 0)),
  );
  const cable = new Cable(
    need(root, "USB_Cable_Start").getWorldPosition(new Vector3()),
    plugObject,
    back,
    plugObject.parent ?? root,
    CABLE_COLOR,
  );
  glows.get("usb")?.push({
    material: cable.mesh.material,
    color: cable.mesh.material.emissive.clone(),
    intensity: 1,
  });

  // Each LED gets its own material (the build's dedup merges identical
  // ones, and a channel has to light alone). Relay LEDs also get a glow just
  // over the relay tops: the LEDs sit in the trench between the two relay
  // columns, where the stool can't see them.
  const led = (name: string, glow = false) => {
    const mesh = needMesh(root, name);
    if (!(mesh.material instanceof MeshStandardMaterial)) {
      throw new Error(`scene.glb: ${name} has no standard material`);
    }
    const material = mesh.material.clone();
    mesh.material = material;
    owned.push(material);
    material.userData.lit = material.emissiveIntensity;
    if (glow) {
      const halo = new SpriteMaterial({
        map: glowMap(),
        color: LED_GLOW.color,
        blending: AdditiveBlending,
        transparent: true,
        depthWrite: false,
        toneMapped: false,
      });
      owned.push(halo);
      const sprite = new Sprite(halo);
      sprite.name = `${name}_Glow`;
      sprite.raycast = noRaycast;
      const at = new Box3().setFromObject(mesh).getCenter(new Vector3());
      at.y += LED_GLOW.lift;
      mesh.add(sprite);
      sprite.position.copy(mesh.worldToLocal(at));
      const scale = mesh.getWorldScale(new Vector3());
      sprite.scale.set(LED_GLOW.size / scale.x, LED_GLOW.size / scale.y, 1);
      sprite.visible = material.emissiveIntensity > 0;
      // setLit (relay-board.ts) shows and hides it with the LED.
      material.userData.glow = sprite;
    }
    return material;
  };

  // Only the objects that open a panel; the rest (the Pi, the mug) are
  // small surprises, not things to look for.
  const outlines = new Outlines(
    new Map([...hits].filter(([id]) => HIT_PANELS[id])),
  );

  const strip = new Box3().setFromObject(need(root, "LED_Strip_Bench"));
  // A mesh's center, or an empty's own position (an empty has no box).
  const world = (name: string) => {
    const object = need(root, name);
    const box = new Box3().setFromObject(object);
    return box.isEmpty()
      ? object.getWorldPosition(new Vector3())
      : box.getCenter(new Vector3());
  };

  return {
    root,
    view,
    overview: shot(root, "Camera_Main", "Cam_Target"),
    stations,
    hits,
    glows,
    outlines,
    plug,
    cable,
    screens: {
      monitor: quad(needMesh(root, "Screen_monitor")),
      laptop: quad(needMesh(root, "Screen_laptop")),
      scope: quad(needMesh(root, "Scope_Screen")),
    },
    leds: {
      relay: Array.from({ length: 8 }, (_, i) => led(`LED_${i + 1}`, true)),
      pi: led("Pi_LED"),
    },
    buildBvh,
    lights: {
      lamp: world("Lamp_Bulb"),
      lampTarget: world("Lamp_Target"),
      pendant: world("Pendant_Bulb"),
      strip: {
        center: strip.getCenter(new Vector3()),
        length: strip.getSize(new Vector3()).x,
      },
      shelf: world("Shelf_LEDs"),
    },
    dispose: () => {
      outlines.dispose();
      cable.dispose();
      owned.forEach((m) => m.dispose());
    },
  };
}

/** A relay channel's glow: a soft orange disc this far over its LED (m), this wide. */
const LED_GLOW = { lift: 0.03, size: 0.02, color: "#ff6a1a" };

let glowTexture: DataTexture | null = null;

/** White with a soft round alpha falloff (shared by every glow; built once). */
function glowMap() {
  if (glowTexture) return glowTexture;
  const n = 32;
  const data = new Uint8Array(n * n * 4);
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const d = Math.hypot(x + 0.5 - n / 2, y + 0.5 - n / 2) / (n / 2);
      data.set(
        [255, 255, 255, Math.round(Math.max(0, 1 - d) ** 2 * 255)],
        (y * n + x) * 4,
      );
    }
  }
  glowTexture = new DataTexture(data, n, n, RGBAFormat);
  glowTexture.needsUpdate = true;
  return glowTexture;
}

const glowAdd = new Color();

/** Tints a group toward signal orange, or puts its own emissive back. */
export function setGlow(glows: Glow[] | undefined, on: boolean) {
  for (const { material, color, intensity } of glows ?? []) {
    material.emissive.copy(color);
    material.emissiveIntensity = intensity;
    if (!on) continue;
    glowAdd.copy(GLOW_COLOR).multiplyScalar(GLOW_STRENGTH);
    material.emissive.multiplyScalar(intensity).add(glowAdd);
    material.emissiveIntensity = 1;
  }
}
