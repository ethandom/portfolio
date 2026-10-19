import {
  AlwaysStencilFunc,
  BoxGeometry,
  Group,
  InstancedMesh,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  NotEqualStencilFunc,
  type ShaderMaterial,
  type Vector2,
  type WebGLRenderer,
} from "three";
import { describe, expect, it } from "vitest";
import type { HitId, StationId } from "./hits";
import { Outlines } from "./outlines";

/** Hit groups as prepareModel leaves them: each mesh with its own material. */
function scene() {
  const object = (parts: number) => {
    const group = new Group();
    for (let i = 0; i < parts; i++) {
      group.add(new Mesh(new BoxGeometry(), new MeshStandardMaterial()));
    }
    return group;
  };
  const hits = new Map<HitId, { group: Group; station: StationId }>([
    ["mug", { group: object(2), station: "workbench" }],
    ["relay", { group: object(3), station: "workbench" }],
    ["chess", { group: object(1), station: "lounge" }],
  ]);
  return { hits, outlines: new Outlines(hits) };
}

/** The renderer calls update makes, with or without a stencil buffer. */
const renderer = (stencil = true) =>
  ({
    getContext: () => ({ getContextAttributes: () => ({ stencil }) }),
    getDrawingBufferSize: (target: Vector2) => target.set(2400, 1350),
    getPixelRatio: () => 1.5,
  }) as unknown as WebGLRenderer;

const parts = (group: Group) =>
  group.children.filter((o): o is Mesh => o instanceof Mesh);
const stamps = (group: Group) =>
  parts(group).map((mesh) => {
    const stamp = mesh.children.find((o) => o instanceof InstancedMesh);
    if (!stamp) throw new Error(`${mesh.name}: no outline`);
    return stamp as InstancedMesh<BoxGeometry, ShaderMaterial>;
  });
const shown = (group: Group) => stamps(group).map((s) => s.visible);

describe("clickable outlines", () => {
  it("stamps each mesh of an object, hidden and never picked", () => {
    const { hits } = scene();
    for (const { group } of hits.values()) {
      for (const [i, stamp] of stamps(group).entries()) {
        expect(stamp.geometry).toBe(parts(group)[i].geometry);
        expect(stamp.visible).toBe(false);
        const hits: unknown[] = [];
        stamp.raycast(undefined as never, hits as never);
        expect(hits).toEqual([]);
      }
    }
  });

  it("gives each object its own stencil ref, written by its surfaces", () => {
    const { hits } = scene();
    const refs = [...hits.values()].map(({ group }) => {
      const [ref] = new Set(
        parts(group).map((mesh) => {
          const m = mesh.material as MeshStandardMaterial;
          expect(m.stencilWrite).toBe(true);
          expect(m.stencilFunc).toBe(AlwaysStencilFunc);
          return m.stencilRef;
        }),
      );
      // The line draws only off the object's own pixels.
      for (const { material } of stamps(group)) {
        expect(material.stencilRef).toBe(ref);
        expect(material.stencilFunc).toBe(NotEqualStencilFunc);
      }
      return ref;
    });
    expect(new Set(refs).size).toBe(refs.length);
    expect(refs).not.toContain(0);
  });

  it("outlines only the objects at the station shown", () => {
    const { hits, outlines } = scene();
    const mug = hits.get("mug")!.group;
    const chess = hits.get("chess")!.group;
    outlines.show("workbench");
    expect(shown(mug)).toEqual([true, true]);
    expect(shown(chess)).toEqual([false]);
    outlines.show("lounge");
    expect(shown(mug)).toEqual([false, false]);
    expect(shown(chess)).toEqual([true]);
    outlines.show(null);
    expect(shown(chess)).toEqual([false]);
  });

  it("draws the hovered object stronger, and fades with the level", () => {
    const { hits, outlines } = scene();
    const opacity = (id: HitId) =>
      stamps(hits.get(id)!.group)[0].material.uniforms.uOpacity.value;
    const width = (id: HitId) =>
      stamps(hits.get(id)!.group)[0].material.uniforms.uWidth.value;
    outlines.show("workbench");
    outlines.hover("relay");
    outlines.update(renderer());
    expect(opacity("relay")).toBeGreaterThan(opacity("mug"));
    expect(width("relay")).toBeGreaterThan(width("mug"));
    // Widths are CSS px, drawn in device pixels.
    expect(width("mug")).toBeCloseTo(1.5 * 1.5);
    const full = opacity("mug");
    outlines.level = 0.5;
    expect(opacity("mug")).toBeCloseTo(full / 2);
    outlines.hover(null);
    expect(opacity("relay")).toBeCloseTo(opacity("mug"));
  });

  it("follows a mesh's new geometry and material", () => {
    const { hits, outlines } = scene();
    const mug = hits.get("mug")!.group;
    const [mesh] = parts(mug);
    const ref = (mesh.material as MeshStandardMaterial).stencilRef;
    outlines.show("workbench");
    // A screen swaps its material in.
    mesh.geometry = new BoxGeometry(2, 2, 2);
    mesh.material = new MeshBasicMaterial();
    outlines.update(renderer());
    expect(stamps(mug)[0].geometry).toBe(mesh.geometry);
    expect((mesh.material as MeshBasicMaterial).stencilRef).toBe(ref);
    expect((mesh.material as MeshBasicMaterial).stencilWrite).toBe(true);
  });

  it("draws nothing without a stencil buffer", () => {
    const { hits, outlines } = scene();
    outlines.show("workbench");
    outlines.update(renderer(false));
    expect(shown(hits.get("mug")!.group)).toEqual([false, false]);
    outlines.show("workbench");
    expect(shown(hits.get("mug")!.group)).toEqual([false, false]);
  });

  it("keeps its stamps in the tree when disposed (Strict Mode keeps drawing)", () => {
    const { hits, outlines } = scene();
    outlines.dispose();
    expect(stamps(hits.get("relay")!.group)).toHaveLength(3);
  });
});
