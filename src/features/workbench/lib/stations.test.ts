import {
  Box3,
  InstancedMesh,
  Mesh,
  PerspectiveCamera,
  Raycaster,
  Vector2,
  Vector3,
} from "three";
import { acceleratedRaycast } from "three-mesh-bvh";
import { describe, expect, it } from "vitest";
import { hasSceneGlb, loadSceneGlb } from "@/testing/scene-glb";
import { HIT_IDS, STATION_IDS } from "./hits";
import { prepareModel } from "./model";
import { fitVerticalFov } from "./framing";
import { HIT_PANELS, STATION_PANELS } from "./panels";
import { zoneAt } from "./picking";
import { showMask } from "./relay-board";

const load = async () => prepareModel(await loadSceneGlb());

const box = (corners: Vector3[]) => new Box3().setFromPoints(corners);

describe.skipIf(!hasSceneGlb)("stations and panels in scene.glb", () => {
  it("has a camera and a zone for every station", async () => {
    const model = await load();
    for (const id of STATION_IDS) {
      const station = model.stations.get(id);
      expect(station, id).toBeDefined();
      expect(station?.corners).toHaveLength(8);
      // The camera sits outside its zone, looking in.
      expect(box(station!.corners).containsPoint(station!.shot.position)).toBe(
        false,
      );
    }
  });

  it("keeps the zones apart, so a hover picks one station", async () => {
    const model = await load();
    const ids = [...model.stations.keys()];
    for (const [i, a] of ids.entries()) {
      for (const b of ids.slice(i + 1)) {
        const overlap = box(model.stations.get(a)!.corners).intersect(
          box(model.stations.get(b)!.corners),
        );
        const size = overlap.isEmpty()
          ? 0
          : overlap
              .getSize(new Vector3())
              .toArray()
              .reduce((p, v) => p * v);
        expect(size, `${a} x ${b}`).toBeLessThan(1e-6);
      }
    }
  });

  it("puts every object with a panel at a station", async () => {
    const model = await load();
    for (const id of HIT_IDS) expect(model.hits.has(id), id).toBe(true);
    expect(model.hits.get("rack")?.station).toBe("rack");
    expect(model.hits.get("book")?.station).toBe("shelf");
    expect(model.hits.get("puppet")?.station).toBe("shelf");
    expect(model.hits.get("headphones")?.station).toBe("workbench");
    for (const id of Object.keys(HIT_PANELS) as (keyof typeof HIT_PANELS)[]) {
      expect(model.hits.get(id)?.station, id).toBeDefined();
    }
    for (const id of Object.keys(STATION_PANELS)) {
      expect(model.stations.has(id as never), id).toBe(true);
    }
  });

  it("outlines the objects that open a panel, and only those", async () => {
    const model = await load();
    for (const [id, { group }] of model.hits) {
      let lines = 0;
      group.traverse((o) => {
        if (o instanceof InstancedMesh) lines++;
      });
      expect(lines > 0, id).toBe(HIT_PANELS[id] !== undefined);
    }
  });

  it("keeps every clickable object inside its station's zone", async () => {
    const model = await load();
    for (const [id, { group, station }] of model.hits) {
      // 2 cm of slack: the Worlds frame hangs on the wall the lounge's zone ends at.
      const zone = box(model.stations.get(station)!.corners).expandByScalar(
        0.02,
      );
      const center = new Box3().setFromObject(group).getCenter(new Vector3());
      expect(
        zone.containsPoint(center),
        `${id} at ${station}: ${center.toArray().map((v) => v.toFixed(3))}`,
      ).toBe(true);
    }
  });

  it("lights one relay channel alone, glow and all, where the stool can see it", async () => {
    const model = await load();
    const leds = model.leds.relay;
    expect(new Set(leds).size).toBe(8);
    showMask(leds, 0b100); // CH3
    leds.forEach((led, i) => {
      const glow = led.userData.glow as { visible: boolean } | undefined;
      expect(glow, `LED_${i + 1}`).toBeDefined();
      expect(glow?.visible).toBe(i === 2);
      expect(led.emissiveIntensity > 0).toBe(i === 2);
    });
    // The glow floats over the relay tops: above every relay body on the board.
    const glow = model.root.getObjectByName("LED_3_Glow")!;
    const top = Math.max(
      ...[1, 2, 3, 4, 5, 6, 7, 8].map(
        (n) =>
          new Box3().setFromObject(model.root.getObjectByName(`Relay_${n}`)!)
            .max.y,
      ),
    );
    expect(glow.getWorldPosition(new Vector3()).y).toBeGreaterThan(top);
  });

  it("loads every node with a real transform", async () => {
    const model = await load();
    const bad: string[] = [];
    model.root.traverse((o) => {
      if (o.matrixWorld.elements.some(Number.isNaN)) bad.push(o.name);
    });
    expect(bad).toEqual([]);
  });

  it("raycasts through the BVH exactly as a plain raycast would", async () => {
    const model = await load();
    // The scene builds it in idle slices; a slice stops early, then resumes.
    expect(model.buildBvh(0)).toBe(false);
    expect(model.buildBvh()).toBe(true);
    const from = model.overview.position;
    let checked = 0;
    model.root.traverse((o) => {
      if (!(o instanceof Mesh) || o.raycast !== acceleratedRaycast) return;
      const box = new Box3().setFromObject(o);
      if (box.isEmpty()) return;
      const to = box.getCenter(new Vector3());
      const ray = new Raycaster(from.clone(), to.sub(from).normalize());
      const fast: unknown[] = [];
      const plain: unknown[] = [];
      o.raycast(ray, fast as never);
      Mesh.prototype.raycast.call(o, ray, plain as never);
      expect(fast.length, o.name).toBe(plain.length);
      checked++;
    });
    expect(checked).toBeGreaterThan(100);
  });

  // Points on the overview at 800 x 735 (the browser pane) and what they should outline.
  it.each([
    [450, 300, "shelf"],
    [500, 330, "shelf"],
    [540, 380, "shelf"],
    [470, 400, "shelf"],
    [560, 280, "shelf"],
    [650, 400, "lounge"],
    [700, 430, "lounge"],
    [620, 450, "lounge"],
    [690, 310, "lounge"],
    [330, 380, "workbench"],
    [110, 455, "rack"],
  ])("outlines the station under (%i, %i): %s", async (x, y, expected) => {
    const model = await load();
    const [w, h] = [800, 735];
    const camera = new PerspectiveCamera(
      fitVerticalFov(model.overview.lens, w / h),
      w / h,
      0.05,
      5000,
    );
    camera.position.copy(model.overview.position);
    camera.lookAt(model.overview.target);
    camera.updateMatrixWorld();
    const ray = new Raycaster();
    ray.setFromCamera(new Vector2((x / w) * 2 - 1, 1 - (y / h) * 2), camera);
    expect(zoneAt(model.stations, ray.intersectObject(model.root, true))).toBe(
      expected,
    );
  });
});
