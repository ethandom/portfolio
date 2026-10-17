import { Box3, Vector3 } from "three";
import { describe, expect, it } from "vitest";
import { hasSceneGlb, loadSceneGlb } from "@/testing/scene-glb";
import { HIT_IDS, STATION_IDS } from "./hits";
import { prepareModel } from "./model";
import { HIT_PANELS, STATION_PANELS } from "./panels";
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
    for (const id of Object.keys(HIT_PANELS) as (keyof typeof HIT_PANELS)[]) {
      expect(model.hits.get(id)?.station, id).toBeDefined();
    }
    for (const id of Object.keys(STATION_PANELS)) {
      expect(model.stations.has(id as never), id).toBe(true);
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
});
