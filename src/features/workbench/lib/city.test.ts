import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import {
  type BufferGeometry,
  Mesh,
  MeshBasicMaterial,
  Object3D,
  Points,
  Raycaster,
  Texture,
  Vector2,
  Vector3,
  type WebGLRenderer,
} from "three";
import { describe, expect, it } from "vitest";
import {
  CITY_URL,
  type CityLayer,
  cityPoint,
  layerGeometry,
  layerOrder,
  layerUv,
  MAX_DISTANCE,
  noise,
  parseCity,
  resampleTrack,
  slotOf,
  touchOrder,
  trackLength,
} from "./city";
import { buildCity } from "./city-scene";

/** The manifest example in assets/workbench/city/README.md, comments dropped. */
const README_EXAMPLE = {
  version: 1,
  placeholder: false,
  credit: "© OpenStreetMap contributors",
  eye: [0, 1.4, -2.75],
  layers: [
    {
      id: "far",
      file: "far.webp",
      projection: "cylindrical",
      radius: 1600,
      az: [-80, 80],
      el: [-10, 40],
      alpha: false,
    },
    {
      id: "near",
      file: "near.webp",
      projection: "cylindrical",
      radius: 450,
      az: [-80, 80],
      el: [-35, 3],
      alpha: true,
    },
  ],
  aviation: [{ az: 13.1, el: 11.6, r: 1590, phase: 0.0 }],
  traffic: [
    {
      points: [
        [-40.2, -2.1],
        [-20.0, -2.6],
        [5.0, -2.9],
      ],
      r: 1100,
      kind: "head",
      dir: 1,
    },
    {
      points: [
        [-40.0, -2.0],
        [-20.0, -2.5],
        [5.0, -2.8],
      ],
      r: 1100,
      kind: "tail",
      dir: -1,
    },
  ],
  windows: [
    { az: [-30.21, -30.15], el: [4.8, 4.86], r: 1590, color: "#ffd9a0" },
  ],
};

/** The example as loose JSON, so a test can break it any way it likes. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Loose = any;

/** The example with one change; `edit` gets a deep copy. */
function variant(edit: (city: Loose) => unknown) {
  const city = structuredClone(README_EXAMPLE);
  edit(city);
  return city;
}

const DEG = Math.PI / 180;
const far = README_EXAMPLE.layers[0] as CityLayer;

describe("city projection", () => {
  it("puts azimuth 0 straight ahead (−Z), + to the right (+X), height on tan(el)", () => {
    const near = (v: Vector3, x: number, y: number, z: number) => {
      expect(v.x).toBeCloseTo(x, 9);
      expect(v.y).toBeCloseTo(y, 9);
      expect(v.z).toBeCloseTo(z, 9);
    };
    near(cityPoint(0, 0, 100), 0, 0, -100);
    near(cityPoint(90, 0, 100), 100, 0, 0);
    near(cityPoint(-90, 0, 100), -100, 0, 0);
    near(cityPoint(0, 45, 100), 0, 100, -100);
    near(
      cityPoint(30, -10, 1600),
      800,
      1600 * Math.tan(-10 * DEG),
      -1600 * Math.cos(30 * DEG),
    );
    // Every point sits on its cylinder, whatever the elevation.
    const p = cityPoint(-63, 27, 450);
    expect(Math.hypot(p.x, p.z)).toBeCloseTo(450, 9);
  });

  it("maps image x linear in azimuth and y linear in tan(el), or in el for equirect", () => {
    expect(layerUv(far, -80, 40)).toEqual([0, 0]);
    const [u, v] = layerUv(far, 80, -10);
    expect(u).toBeCloseTo(1, 12);
    expect(v).toBeCloseTo(1, 12);
    const top = Math.tan(40 * DEG);
    const bottom = Math.tan(-10 * DEG);
    expect(layerUv(far, 0, 0)[0]).toBeCloseTo(0.5, 12);
    expect(layerUv(far, 0, 0)[1]).toBeCloseTo(top / (top - bottom), 12);
    const equirect = { ...far, projection: "equirect" as const };
    expect(layerUv(equirect, 0, 0)[1]).toBeCloseTo(40 / 50, 12);
  });
});

/** Positions as Vector3s. */
const vertices = (g: BufferGeometry) => {
  const p = g.attributes.position;
  return Array.from({ length: p.count }, (_, i) =>
    new Vector3().fromBufferAttribute(p, i),
  );
};

describe("layer geometry", () => {
  it("spans the layer's azimuths and elevations on its cylinder", () => {
    const g = layerGeometry(far);
    g.computeBoundingBox();
    const box = g.boundingBox!;
    const side = 1600 * Math.sin(80 * DEG);
    expect(box.min.x).toBeCloseTo(-side, 2);
    expect(box.max.x).toBeCloseTo(side, 2);
    expect(box.min.y).toBeCloseTo(1600 * Math.tan(-10 * DEG), 2);
    expect(box.max.y).toBeCloseTo(1600 * Math.tan(40 * DEG), 2);
    expect(box.min.z).toBeCloseTo(-1600, 2);
    for (const v of vertices(g))
      expect(Math.hypot(v.x, v.z)).toBeCloseTo(1600, 2);
  });

  it("is smooth: a 160° arc at 1.6 km bows less than 10 cm between columns", () => {
    const g = layerGeometry(far);
    // Cylindrical: one row of quads, a column a degree.
    expect(g.attributes.position.count).toBeGreaterThanOrEqual(2 * 161);
    const step = (160 / (g.attributes.position.count / 2 - 1)) * DEG;
    expect(1600 * (1 - Math.cos(step / 2))).toBeLessThan(0.1);
  });

  it("puts the image's corners at the layer's corners", () => {
    const g = layerGeometry(far);
    const uv = g.attributes.uv;
    const at = (az: number, el: number) => {
      const target = cityPoint(az, el, 1600);
      const i = vertices(g).findIndex((v) => v.distanceTo(target) < 1e-2);
      expect(i, `${az}, ${el}`).toBeGreaterThanOrEqual(0);
      return [uv.getX(i), uv.getY(i)].map((n) => Number(n.toFixed(6)));
    };
    expect(at(-80, 40)).toEqual([0, 0]);
    expect(at(80, 40)).toEqual([1, 0]);
    expect(at(-80, -10)).toEqual([0, 1]);
    expect(at(80, -10)).toEqual([1, 1]);
  });

  it("rows equirect layers so v follows the elevation", () => {
    const layer = { ...far, projection: "equirect" as const };
    const g = layerGeometry(layer);
    const uv = g.attributes.uv;
    vertices(g).forEach((v, i) => {
      const el = Math.atan2(v.y, Math.hypot(v.x, v.z)) / DEG;
      expect(uv.getY(i)).toBeCloseTo((40 - el) / 50, 5);
    });
  });

  it("faces the eye", () => {
    const g = layerGeometry(far);
    const p = vertices(g);
    const index = g.index!.array;
    for (let i = 0; i < index.length; i += 3) {
      const [a, b, c] = [p[index[i]], p[index[i + 1]], p[index[i + 2]]];
      const normal = b.clone().sub(a).cross(c.clone().sub(a));
      // The eye is the origin: the face's normal points back at it.
      expect(normal.dot(a)).toBeLessThan(0);
    }
  });
});

describe("city.json", () => {
  it("accepts the README's example, with defaults for missing lists", () => {
    const city = parseCity(README_EXAMPLE);
    expect(city.layers.map((l) => l.id)).toEqual(["far", "near"]);
    const bare = parseCity(
      variant((c) => {
        delete c.aviation;
        delete c.traffic;
        delete c.windows;
        delete c.placeholder;
      }),
    );
    expect(bare).toMatchObject({
      placeholder: false,
      aviation: [],
      traffic: [],
      windows: [],
    });
  });

  it.each<[string, (c: Loose) => unknown]>([
    ["an unknown version", (c) => (c.version = 2)],
    ["no layers", (c) => (c.layers = [])],
    ["a reversed azimuth range", (c) => (c.layers[0].az = [80, -80])],
    ["an elevation at the pole", (c) => (c.layers[0].el = [-10, 90])],
    ["a path in a file name", (c) => (c.layers[1].file = "../scene.glb")],
    ["a non-image file", (c) => (c.layers[1].file = "near.js")],
    ["two layers with one file", (c) => (c.layers[1].file = "far.webp")],
    ["an unknown projection", (c) => (c.layers[0].projection = "fisheye")],
    ["a nearer layer drawn first", (c) => c.layers.reverse()],
    [
      "two overlapping layers on one cylinder",
      (c) => (c.layers[1].radius = 1600),
    ],
    ["a layer past the far plane", (c) => (c.layers[0].el = [-10, 75])],
    ["a light behind the far layer", (c) => (c.aviation[0].r = 1700)],
    ["a light on a layer's cylinder", (c) => (c.aviation[0].r = 450)],
    ["a one-point road", (c) => c.traffic[0].points.splice(1)],
    [
      "a road with no length",
      (c) =>
        (c.traffic[0].points = [
          [1, -2],
          [1, -2],
        ]),
    ],
    ["a direction of 0", (c) => (c.traffic[0].dir = 0)],
    ["an unknown traffic kind", (c) => (c.traffic[0].kind = "bus")],
    ["a named color", (c) => (c.windows[0].color = "orange")],
    ["a window with no width", (c) => (c.windows[0].az = [-30, -30])],
  ])("rejects %s", (_, edit) => {
    expect(() => parseCity(variant(edit))).toThrow(/Invalid city\.json/);
  });

  it("draws each live touch after the layer behind it", () => {
    const layers = README_EXAMPLE.layers;
    expect(slotOf(layers, 1590)).toBe(0);
    expect(slotOf(layers, 1100)).toBe(0);
    expect(slotOf(layers, 300)).toBe(1);
    expect(layerOrder(0)).toBeLessThan(touchOrder(0));
    expect(touchOrder(0)).toBeLessThan(layerOrder(1));
    expect(layerOrder(1)).toBeLessThan(touchOrder(1));
    // Before the room's own see-through parts (renderOrder 0).
    expect(touchOrder(3)).toBeLessThan(0);
  });
});

describe("live touches", () => {
  it("resamples a road evenly along its cylinder", () => {
    const points = README_EXAMPLE.traffic[0].points;
    const { samples, length } = resampleTrack(points, 1100, 101);
    expect(length).toBeCloseTo(trackLength(points, 1100), 6);
    const at = (k: number) => new Vector3().fromArray(samples, k * 4);
    expect(at(0).distanceTo(cityPoint(-40.2, -2.1, 1100))).toBeLessThan(1e-2);
    expect(at(100).distanceTo(cityPoint(5, -2.9, 1100))).toBeLessThan(1e-2);
    const gaps = Array.from({ length: 100 }, (_, k) =>
      at(k).distanceTo(at(k + 1)),
    );
    for (const gap of gaps) expect(gap).toBeCloseTo(length / 100, 1);
    for (let k = 0; k <= 100; k++) {
      expect(Math.hypot(at(k).x, at(k).z)).toBeCloseTo(1100, 1);
    }
  });

  it("draws random-looking but repeatable", () => {
    expect(noise(7, 1)).toBe(noise(7, 1));
    expect(noise(7, 1)).not.toBe(noise(8, 1));
    expect(noise(7, 1)).not.toBe(noise(7, 2));
    const values = Array.from({ length: 4000 }, (_, i) => noise(i, 3));
    for (const v of values) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
    const mean = values.reduce((a, b) => a + b) / values.length;
    expect(mean).toBeCloseTo(0.5, 1);
  });
});

/** A renderer as tick() sees it: DPR 1.5 at 1920 × 1080 device pixels. */
const renderer = {
  getPixelRatio: () => 1.5,
  getDrawingBufferSize: (v: Vector2) => v.set(1920, 1080),
} as unknown as WebGLRenderer;

const build = (json = README_EXAMPLE) => {
  const manifest = parseCity(json);
  return buildCity(
    manifest,
    manifest.layers.map(() => new Texture()),
  );
};

describe("the built city", () => {
  it("stays within a handful of draw calls, in order, at the eye", () => {
    const city = build();
    // Two layers, then one draw each for lights, traffic and windows.
    expect(city.draws).toBe(5);
    const drawn: { name: string; order: number }[] = [];
    city.root.traverse((o) => {
      if (o instanceof Mesh || o instanceof Points) {
        drawn.push({ name: o.name, order: o.renderOrder });
      }
    });
    expect(drawn).toHaveLength(5);
    const order = (name: string) => drawn.find((d) => d.name === name)!.order;
    expect(order("City_far")).toBeLessThan(order("City_traffic"));
    expect(order("City_traffic")).toBe(order("City_windows"));
    expect(order("City_windows")).toBe(order("City_aviation"));
    expect(order("City_aviation")).toBeLessThan(order("City_near"));
    expect(city.root.position.toArray()).toEqual([0, 1.4, -2.75]);
  });

  it("covers its live touches with their bounds, and stays inside the far plane", () => {
    const city = build();
    city.root.traverse((o) => {
      if (!(o instanceof Mesh || o instanceof Points)) return;
      const sphere = o.geometry.boundingSphere!;
      expect(sphere, o.name).toBeDefined();
      expect(sphere.center.length() + sphere.radius, o.name).toBeLessThan(
        MAX_DISTANCE + 100,
      );
    });
    const traffic = city.root.getObjectByName("City_traffic") as Mesh;
    const sphere = traffic.geometry.boundingSphere!;
    for (const road of README_EXAMPLE.traffic) {
      for (const [az, el] of road.points) {
        expect(sphere.containsPoint(cityPoint(az, el, road.r))).toBe(true);
      }
    }
    // A car every ~26 m of road.
    const cars = (traffic.geometry as { instanceCount?: number })
      .instanceCount!;
    const road = README_EXAMPLE.traffic.reduce(
      (sum, t) => sum + trackLength(t.points, t.r),
      0,
    );
    expect(cars).toBeGreaterThan(road / 40);
    expect(cars).toBeLessThan(road / 15);
  });

  it("can't be hovered or clicked", () => {
    const city = build();
    const parent = new Object3D();
    parent.add(city.root);
    parent.updateMatrixWorld(true);
    const ray = new Raycaster(
      new Vector3(0, 1.4, -2.75),
      new Vector3(0, 0, -1),
    );
    expect(ray.intersectObject(parent, true)).toEqual([]);
  });

  it("fades in over 0.6 s, then takes opaque layers out of blending", () => {
    const city = build();
    const material = (name: string) =>
      (city.root.getObjectByName(name) as Mesh).material as MeshBasicMaterial;
    // True while it fades: the scene draws every frame until then.
    expect(city.tick(0.016, renderer, false)).toBe(true);
    expect(material("City_far").opacity).toBe(0);
    for (let i = 0; i < 18; i++) city.tick(0.016, renderer, false);
    const mid = material("City_far").opacity;
    expect(mid).toBeGreaterThan(0.2);
    expect(mid).toBeLessThan(0.8);
    for (let i = 0; i < 30; i++) city.tick(0.016, renderer, false);
    expect(city.tick(0.016, renderer, false)).toBe(false);
    expect(material("City_far").opacity).toBe(1);
    expect(material("City_far").transparent).toBe(false);
    expect(material("City_near").transparent).toBe(true);
    expect(material("City_near").depthWrite).toBe(false);
  });

  it("shows at once and holds still under reduced motion", () => {
    const city = build();
    const lights = city.root.getObjectByName("City_aviation") as Points;
    const uniforms = (
      lights.material as unknown as {
        uniforms: Record<string, { value: unknown }>;
      }
    ).uniforms;
    city.tick(0.016, renderer, true);
    expect(uniforms.uFade.value).toBe(1);
    expect(uniforms.uMotion.value).toBe(0);
    for (let i = 0; i < 10; i++) city.tick(0.5, renderer, true);
    expect(uniforms.uTime.value).toBe(0);
    city.tick(0.5, renderer, false);
    expect(uniforms.uTime.value).toBe(0.5);
    expect(uniforms.uPixelRatio.value).toBe(1.5);
    expect((uniforms.uResolution.value as Vector2).toArray()).toEqual([
      1920, 1080,
    ]);
  });

  it("hides the stand-in skyline while it's up", () => {
    const city = build();
    const stand = new Object3D();
    const undo = city.replace(stand);
    expect(stand.visible).toBe(false);
    undo();
    expect(stand.visible).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// The served files, when there are any.

const CITY_DIR = path.resolve(
  __dirname,
  "../../../../public",
  `.${path.dirname(CITY_URL)}`,
);
const MANIFEST = path.join(CITY_DIR, "city.json");

/** Budgets from assets/workbench/city/README.md. */
const BUDGET = {
  download: 1_500_000,
  gpu: 64 * 2 ** 20,
  side: 8192,
};

/** An image's size in pixels from its header (WebP and PNG), or null. */
function imageSize(file: string): [number, number] | null {
  const b = readFileSync(file);
  if (
    b.toString("ascii", 0, 4) === "RIFF" &&
    b.toString("ascii", 8, 12) === "WEBP"
  ) {
    const chunk = b.toString("ascii", 12, 16);
    if (chunk === "VP8 ")
      return [b.readUInt16LE(26) & 0x3fff, b.readUInt16LE(28) & 0x3fff];
    if (chunk === "VP8L") {
      const bits = b.readUInt32LE(21);
      return [(bits & 0x3fff) + 1, ((bits >> 14) & 0x3fff) + 1];
    }
    if (chunk === "VP8X")
      return [b.readUIntLE(24, 3) + 1, b.readUIntLE(27, 3) + 1];
  }
  if (b.readUInt32BE(0) === 0x89504e47)
    return [b.readUInt32BE(16), b.readUInt32BE(20)];
  return null;
}

describe.skipIf(!existsSync(MANIFEST))("public/workbench/city", () => {
  const manifest = () => parseCity(JSON.parse(readFileSync(MANIFEST, "utf8")));

  it("has a valid city.json", () => {
    expect(() => manifest()).not.toThrow();
  });

  it("serves every layer it names, within the download and GPU budgets", () => {
    const city = manifest();
    let download = statSync(MANIFEST).size;
    let gpu = 0;
    for (const layer of city.layers) {
      const file = path.join(CITY_DIR, layer.file);
      expect(existsSync(file), layer.file).toBe(true);
      download += statSync(file).size;
      const size = imageSize(file);
      if (!size) continue;
      const [width, height] = size;
      expect(Math.max(width, height), layer.file).toBeLessThanOrEqual(
        BUDGET.side,
      );
      // RGBA8 plus mipmaps.
      gpu += (width * height * 4 * 4) / 3;
    }
    expect(download).toBeLessThanOrEqual(BUDGET.download);
    expect(gpu).toBeLessThanOrEqual(BUDGET.gpu);
  });

  it("builds", () => {
    const city = manifest();
    const view = buildCity(
      city,
      city.layers.map(() => new Texture()),
    );
    expect(view.draws).toBeLessThanOrEqual(8);
    view.dispose();
  });
});
