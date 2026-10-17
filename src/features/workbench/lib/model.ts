import {
  AdditiveBlending,
  Box3,
  Color,
  DataTexture,
  type Material,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  type Object3D,
  PerspectiveCamera,
  Quaternion,
  RGBAFormat,
  Sprite,
  SpriteMaterial,
  Vector3,
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

/** Served from public/workbench; built by assets/workbench/build.sh (Blender export, meshopt + WebP), Y up, meters. */
export const MODEL_URL = "/workbench/scene.glb";

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
};

export type WorkbenchModel = {
  root: Object3D;
  /** Camera_Main looking at Cam_Target. */
  overview: Shot;
  stations: Map<StationId, Station>;
  /** Each Hit_ group and the station it belongs to. */
  hits: Map<HitId, { group: Object3D; station: StationId }>;
  glows: Map<HitId, Glow[]>;
  /** USB_Plug and its two local positions: on the bench, and in USB_Port. */
  plug: { object: Object3D; home: Vector3; docked: Vector3 };
  cable: Cable;
  screens: { monitor: ScreenQuad; laptop: ScreenQuad; scope: ScreenQuad };
  /** LED materials (this model's own copies) and their lit intensity. */
  /** Relay channel LEDs in channel order (LED_1 = channel 0), and the Pi's activity LED. */
  leds: { relay: MeshStandardMaterial[]; pi: MeshStandardMaterial };
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
 * builds the whole scene in ~150 ms; the trees stay on the cached geometry,
 * so a re-prepared model reuses them. Meshes that already opt out of
 * raycasts are left alone.
 */
function accelerate(root: Object3D) {
  root.traverse((o) => {
    if (!(o instanceof Mesh) || o.raycast !== Mesh.prototype.raycast) return;
    if (!o.geometry.boundsTree) {
      computeBoundsTree.call(o.geometry, { strategy: CENTER });
    }
    o.raycast = acceleratedRaycast;
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
  root.getObjectByName("View")?.traverse((o) => {
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

  // Zones: never drawn, still hit by the raycaster.
  const hidden = new MeshBasicMaterial({
    colorWrite: false,
    depthWrite: false,
  });
  owned.push(hidden);
  const stations = new Map<StationId, Station>();
  for (const id of STATION_IDS) {
    // A station the build doesn't have yet is left out (model.test.ts
    // asserts every one), so the app runs on an older scene.glb.
    if (!root.getObjectByName(`Zone_${id}`)) continue;
    const zone = needMesh(root, `Zone_${id}`);
    zone.material = hidden;
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
  accelerate(root);

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
    overview: shot(root, "Camera_Main", "Cam_Target"),
    stations,
    hits,
    glows,
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
