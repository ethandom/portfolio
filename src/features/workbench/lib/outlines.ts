import {
  AlwaysStencilFunc,
  Color,
  DoubleSide,
  InstancedMesh,
  type Material,
  Mesh,
  NotEqualStencilFunc,
  type Object3D,
  ReplaceStencilOp,
  ShaderMaterial,
  Vector2,
  type WebGLRenderer,
} from "three";
import type { HitId, StationId } from "./hits";

/** Copies of the silhouette, each nudged one way around a circle: together, a ring. */
const STAMPS = 8;
/**
 * Night Shift ink, like the overview's zone outline. Width in CSS px, and
 * opacity: soft at rest, full under the pointer or keyboard focus.
 */
const LOOK = {
  idle: { width: 1.5, opacity: 0.7 },
  hover: { width: 2, opacity: 1 },
};
/**
 * Meters the line sits toward the camera, so it still shows where an
 * object meets what it rests on (the mug's base on the bench) and isn't
 * hidden by surfaces this close in front of it.
 */
const LIFT = 0.006;
/** After everything else, the city and the room's see-through parts included. */
const ORDER = 1000;

const vertexShader = /* glsl */ `
#include <common>
#include <logdepthbuf_pars_vertex>
uniform vec2 uResolution;
uniform float uWidth;
uniform float uLift;
void main() {
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  // Along the view ray: nearer, but on the same pixel.
  mvPosition.xyz -= normalize(mvPosition.xyz) * uLift;
  gl_Position = projectionMatrix * mvPosition;
  float angle = float(gl_InstanceID) * (2.0 * PI / ${STAMPS}.0);
  gl_Position.xy += vec2(cos(angle), sin(angle)) * uWidth * 2.0 / uResolution * gl_Position.w;
  #include <logdepthbuf_vertex>
}
`;

const fragmentShader = /* glsl */ `
#include <logdepthbuf_pars_fragment>
uniform vec3 uColor;
uniform float uOpacity;
void main() {
  #include <logdepthbuf_fragment>
  gl_FragColor = vec4(uColor, uOpacity);
  #include <colorspace_fragment>
}
`;

const noRaycast = () => {};

/** An object's surfaces write its stencil ref wherever they're drawn. */
function mark(material: Material | Material[], ref: number) {
  for (const m of [material].flat()) {
    m.stencilWrite = true;
    m.stencilRef = ref;
    m.stencilFunc = AlwaysStencilFunc;
    m.stencilZPass = ReplaceStencilOp;
  }
}

type Outlined = {
  id: HitId;
  station: StationId;
  ref: number;
  material: ShaderMaterial;
  /** Each of the object's meshes and the stamps drawn from it. */
  pairs: { source: Mesh; stamps: InstancedMesh }[];
};

/**
 * Thin lines around the objects at a station that open a panel, so they
 * read as clickable before the pointer finds them. Each object's surfaces write
 * its own stencil ref as they draw; after everything else, each mesh draws
 * again as STAMPS copies nudged around a circle a line width out, only
 * where the stencil isn't the object's own (the copies' overlap with the
 * object itself) and never twice on a pixel (each stamp writes the ref
 * too). The result is the object's outer silhouette alone, not every part's
 * edge, a constant width on screen, and hidden behind whatever stands in
 * front of the object (depth-tested). Overlapping objects keep their own
 * lines, since their refs differ. Needs a stencil buffer (the Canvas asks
 * for one); without it, no lines.
 */
export class Outlines {
  private readonly objects: Outlined[] = [];
  private readonly resolution = { value: new Vector2(1, 1) };
  private station: StationId | null = null;
  private hovered: HitId | null = null;
  private fade = 1;
  private readonly color = new Color("#e8e1d4");
  private supported: boolean | null = null;

  constructor(
    hits: ReadonlyMap<HitId, { group: Object3D; station: StationId }>,
  ) {
    [...hits].forEach(([id, { group, station }], i) => {
      const ref = i + 1;
      const material = new ShaderMaterial({
        uniforms: {
          uResolution: this.resolution,
          uWidth: { value: 0 },
          uLift: { value: LIFT },
          uColor: { value: new Color() },
          uOpacity: { value: 0 },
        },
        vertexShader,
        fragmentShader,
        side: DoubleSide,
        transparent: true,
        depthWrite: false,
        toneMapped: false,
        stencilWrite: true,
        stencilRef: ref,
        stencilFunc: NotEqualStencilFunc,
        stencilZPass: ReplaceStencilOp,
      });
      const sources: Mesh[] = [];
      group.traverse((o) => {
        if (o instanceof Mesh) sources.push(o);
      });
      const pairs = sources.map((source) => {
        mark(source.material, ref);
        const stamps = new InstancedMesh(source.geometry, material, STAMPS);
        stamps.name = `${source.name}_Outline`;
        stamps.raycast = noRaycast;
        // Its station is in view whenever it shows, and its source's bounds
        // can change (a moved part, a new geometry).
        stamps.frustumCulled = false;
        stamps.renderOrder = ORDER;
        stamps.visible = false;
        source.add(stamps);
        return { source, stamps };
      });
      this.objects.push({ id, station, ref, material, pairs });
    });
    this.restyle();
  }

  /** Outlines the objects at `station`, or none. */
  show(station: StationId | null) {
    this.station = station;
    for (const { station: at, pairs } of this.objects) {
      const on = this.supported !== false && at === station;
      for (const { stamps } of pairs) stamps.visible = on;
    }
  }

  /** The object under the pointer or keyboard focus, drawn stronger. */
  hover(id: HitId | null) {
    this.hovered = id;
    this.restyle();
  }

  /** 0..1, how far the lines have faded in. */
  set level(value: number) {
    this.fade = value;
    this.restyle();
  }

  /** The ink (CSS hex), read off the page. */
  paint(color: string) {
    this.color.setStyle(color);
    this.restyle();
  }

  /**
   * Before each frame: follows the drawing buffer's size, and each mesh's
   * current geometry and material (a screen swaps its material in).
   */
  update(renderer: WebGLRenderer) {
    if (this.supported === null) {
      this.supported =
        renderer.getContext().getContextAttributes()?.stencil === true;
      this.show(this.station);
    }
    if (!this.supported) return;
    renderer.getDrawingBufferSize(this.resolution.value);
    const ratio = renderer.getPixelRatio();
    for (const { id, station, ref, material, pairs } of this.objects) {
      if (station !== this.station) continue;
      const look = id === this.hovered ? LOOK.hover : LOOK.idle;
      material.uniforms.uWidth.value = look.width * ratio;
      for (const { source, stamps } of pairs) {
        if (stamps.geometry !== source.geometry) {
          stamps.geometry = source.geometry;
        }
        mark(source.material, ref);
      }
    }
  }

  private restyle() {
    for (const { id, material } of this.objects) {
      const look = id === this.hovered ? LOOK.hover : LOOK.idle;
      material.uniforms.uColor.value.copy(this.color);
      material.uniforms.uOpacity.value = look.opacity * this.fade;
    }
  }

  /**
   * GPU resources only, the stamps stay in the tree: dev Strict Mode
   * replays the effect that calls this and keeps drawing the model, and
   * three uploads them again at their next draw.
   */
  dispose() {
    for (const { material, pairs } of this.objects) {
      for (const { stamps } of pairs) stamps.dispose();
      material.dispose();
    }
  }
}
