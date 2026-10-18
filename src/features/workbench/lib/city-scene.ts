import {
  AdditiveBlending,
  BufferGeometry,
  type Camera,
  Color,
  DataTexture,
  Float32BufferAttribute,
  FloatType,
  Group,
  InstancedBufferAttribute,
  InstancedBufferGeometry,
  type Material,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  NearestFilter,
  type Object3D,
  Points,
  RGBAFormat,
  type Scene,
  ShaderMaterial,
  Sphere,
  SRGBColorSpace,
  type Texture,
  Vector2,
  Vector3,
  type WebGLRenderer,
} from "three";
import {
  type Aviation,
  type CityManifest,
  type CityWindow,
  cityPoint,
  layerGeometry,
  layerOrder,
  noise,
  resampleTrack,
  slotOf,
  type Traffic,
  touchOrder,
  trackLength,
} from "./city";

/** Seconds: the city fades in over the dusk sky. */
const FADE = 0.6;
/** Texture filtering at the grazing angles near the panorama's edges. */
const ANISOTROPY = 4;

/** Obstruction red (FAA L-864) and its flash: ~33 a minute, short on, long off. */
const AVIATION = { color: "#ff2a1a", period: 1.8, size: 9, steady: 0.8 };

/**
 * Downtown Connector traffic: one streak a car, headlights warm white and
 * taillights red. Speeds in m/s (about 55 mph), lengths in m, width in CSS
 * px. Lanes overlap in one polyline a carriageway, so spacing is per
 * carriageway, not per lane.
 */
const TRAFFIC = {
  head: "#ffe6c0",
  tail: "#ff2414",
  speed: 25,
  spacing: 26,
  dash: 7,
  width: 2,
  /** Cars fade in and out over this stretch at each end of a polyline (m). */
  ends: 40,
  /** A position every this many meters along a polyline (a texel each; a texture row a polyline). */
  sample: 4,
};

/** Windows switch on or off every 1.5–5 minutes, fading over this long (s). */
const WINDOWS = { minSlot: 90, maxSlot: 300, fade: 0.4 };

const noRaycast = () => {};

/** Uniforms every live touch shares; the scene sets them once a frame. */
export type CityUniforms = {
  /** Seconds since the city appeared; stops under reduced motion. */
  uTime: { value: number };
  /** 0..1 while the city fades in. */
  uFade: { value: number };
  /** 0 under reduced motion: lights hold steady. */
  uMotion: { value: number };
  uPixelRatio: { value: number };
  /** The drawing buffer, in device pixels. */
  uResolution: { value: Vector2 };
};

/** Shared by the live-touch shaders: screen pixels from clip space. */
const PIXELS = /* glsl */ `
  uniform vec2 uResolution;
  uniform float uPixelRatio;
  vec2 toPixels(vec4 clip) { return clip.xy / clip.w * 0.5 * uResolution; }
  vec4 fromPixels(vec2 px, vec4 clip) {
    return vec4(px / (0.5 * uResolution) * clip.w, clip.z, clip.w);
  }
  // Behind the camera (a station facing away): off the clip volume.
  const vec4 CLIPPED = vec4(0.0, 0.0, 2.0, 1.0);
`;

/** Unlit, additive, depth-tested (the room hides them), never in the depth buffer. */
function lightMaterial(
  uniforms: CityUniforms,
  extra: Record<string, { value: unknown }>,
  vertexShader: string,
  fragmentShader: string,
) {
  return new ShaderMaterial({
    uniforms: { ...uniforms, ...extra },
    vertexShader,
    fragmentShader,
    blending: AdditiveBlending,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    toneMapped: false,
    fog: false,
  });
}

const FRAGMENT_HEAD = /* glsl */ `
  #include <common>
  #include <logdepthbuf_pars_fragment>
  uniform float uFade;
`;

/**
 * Red obstruction lights on spires, crane tips and tall roofs: a point
 * each, a few pixels wide whatever the distance, flashing on its own phase.
 */
function aviationLights(lights: Aviation[], uniforms: CityUniforms) {
  const positions: number[] = [];
  const phases: number[] = [];
  const p = new Vector3();
  for (const light of lights) {
    cityPoint(light.az, light.el, light.r, p);
    positions.push(p.x, p.y, p.z);
    phases.push(light.phase - Math.floor(light.phase));
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geometry.setAttribute("aPhase", new Float32BufferAttribute(phases, 1));
  geometry.computeBoundingSphere();
  const material = lightMaterial(
    uniforms,
    {
      uColor: { value: new Color(AVIATION.color) },
      uSize: { value: AVIATION.size },
    },
    /* glsl */ `
      #include <common>
      #include <logdepthbuf_pars_vertex>
      uniform float uPixelRatio;
      uniform float uSize;
      attribute float aPhase;
      varying float vPhase;
      void main() {
        vPhase = aPhase;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = uSize * uPixelRatio;
        #include <logdepthbuf_vertex>
      }
    `,
    /* glsl */ `
      ${FRAGMENT_HEAD}
      uniform float uTime;
      uniform float uMotion;
      uniform vec3 uColor;
      varying float vPhase;
      void main() {
        #include <logdepthbuf_fragment>
        vec2 p = gl_PointCoord * 2.0 - 1.0;
        float d2 = dot(p, p);
        if (d2 > 1.0) discard;
        // Quick rise, short hold, slower fall; then dark for the rest of the cycle.
        float x = fract(uTime / ${AVIATION.period.toFixed(2)} + vPhase);
        float flash = smoothstep(0.0, 0.04, x) * (1.0 - smoothstep(0.14, 0.3, x));
        float level = mix(${AVIATION.steady.toFixed(2)}, flash, uMotion);
        // A hot core about two pixels wide in a faint red halo.
        float glow = exp(-d2 * 22.0) + 0.06 * exp(-d2 * 5.0);
        gl_FragColor = vec4(uColor * glow * level * uFade, 1.0);
        #include <colorspace_fragment>
      }
    `,
  );
  return new Points(geometry, material);
}

/** A quad from (−1, −1) to (1, 1), instanced: every streak and window is one. */
function unitQuad() {
  const geometry = new InstancedBufferGeometry();
  geometry.setIndex([0, 1, 2, 0, 2, 3]);
  geometry.setAttribute(
    "position",
    new Float32BufferAttribute([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0], 3),
  );
  return geometry;
}

const instanced = (values: number[], size: number) =>
  new InstancedBufferAttribute(new Float32Array(values), size);

/**
 * Cars on the Connector: each polyline becomes a texture row of positions
 * evenly spaced along it, and each car a quad the vertex shader slides
 * along its row with time: a short soft dash along the road, a pixel or
 * two across it. Spacing, speed, length and brightness vary per car from
 * its index, so the stream never repeats in step.
 */
function traffic(tracks: Traffic[], uniforms: CityUniforms, firstId: number) {
  const longest = Math.max(...tracks.map((t) => trackLength(t.points, t.r)));
  const count = MathUtils.clamp(
    Math.ceil(longest / TRAFFIC.sample) + 1,
    2,
    2048,
  );
  const rows = new Float32Array(count * 4 * tracks.length);
  const bounds: Vector3[] = [];
  const track: number[] = [];
  const look: number[] = [];
  const color = new Color();
  let id = firstId;
  tracks.forEach((t, row) => {
    const { samples, length } = resampleTrack(t.points, t.r, count);
    rows.set(samples, row * count * 4);
    for (let k = 0; k < count; k += 8) {
      bounds.push(new Vector3().fromArray(samples, k * 4));
    }
    bounds.push(new Vector3().fromArray(samples, (count - 1) * 4));
    const cars = Math.max(1, Math.round(length / TRAFFIC.spacing));
    for (let j = 0; j < cars; j++, id++) {
      const speed = TRAFFIC.speed * (0.85 + 0.3 * noise(id, 1));
      track.push(
        row,
        (t.dir * speed) / length,
        (j + 0.7 * (noise(id, 2) - 0.5)) / cars,
        length,
      );
      color
        .set(t.kind === "head" ? TRAFFIC.head : TRAFFIC.tail)
        .multiplyScalar(0.45 + 0.55 * noise(id, 3));
      look.push(
        color.r,
        color.g,
        color.b,
        TRAFFIC.dash * (0.75 + 0.5 * noise(id, 4)),
      );
    }
  });

  const texture = new DataTexture(
    rows,
    count,
    tracks.length,
    RGBAFormat,
    FloatType,
  );
  texture.minFilter = texture.magFilter = NearestFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;

  const geometry = unitQuad();
  geometry.setAttribute("aTrack", instanced(track, 4));
  geometry.setAttribute("aLook", instanced(look, 4));
  geometry.instanceCount = track.length / 4;
  geometry.boundingSphere = new Sphere().setFromPoints(bounds);
  geometry.boundingSphere.radius += TRAFFIC.dash;

  const material = lightMaterial(
    uniforms,
    {
      uTracks: { value: texture },
      uWidth: { value: TRAFFIC.width },
    },
    /* glsl */ `
      #include <common>
      #include <logdepthbuf_pars_vertex>
      ${PIXELS}
      uniform highp sampler2D uTracks;
      uniform float uTime;
      uniform float uWidth;
      // Row, cycles per second (signed by direction), start (0..1), track length (m).
      attribute vec4 aTrack;
      // Linear color with its brightness, dash length (m).
      attribute vec4 aLook;
      varying vec2 vCorner;
      varying vec3 vColor;
      varying float vEnds;
      void main() {
        int n = textureSize(uTracks, 0).x;
        int row = int(aTrack.x + 0.5);
        float s = fract(aTrack.z + uTime * aTrack.y);
        float u = s * float(n - 1);
        int i = min(int(u), n - 2);
        vec3 a = texelFetch(uTracks, ivec2(i, row), 0).xyz;
        vec3 b = texelFetch(uTracks, ivec2(i + 1, row), 0).xyz;
        vec3 p = mix(a, b, u - float(i));
        vec3 t = normalize(b - a) * aLook.w * 0.5;
        mat4 mvp = projectionMatrix * modelViewMatrix;
        vec4 c = mvp * vec4(p, 1.0);
        vec4 c0 = mvp * vec4(p - t, 1.0);
        vec4 c1 = mvp * vec4(p + t, 1.0);
        vCorner = position.xy;
        vColor = aLook.rgb;
        float m = s * aTrack.w;
        vEnds = smoothstep(0.0, ${TRAFFIC.ends.toFixed(1)}, m)
          * smoothstep(0.0, ${TRAFFIC.ends.toFixed(1)}, aTrack.w - m);
        if (min(c.w, min(c0.w, c1.w)) <= 0.0) {
          gl_Position = CLIPPED;
          return;
        }
        // Along the road as the dash projects (never shorter than it is
        // wide), a fixed few pixels across it.
        vec2 d = toPixels(c1) - toPixels(c0);
        float len = length(d);
        vec2 along = len > 1e-3 ? d / len : vec2(1.0, 0.0);
        vec2 across = vec2(-along.y, along.x);
        float width = uWidth * uPixelRatio;
        vec2 px = toPixels(c)
          + along * position.x * max(len * 0.5, width * 0.5)
          + across * position.y * width * 0.5;
        gl_Position = fromPixels(px, c);
        #include <logdepthbuf_vertex>
      }
    `,
    /* glsl */ `
      ${FRAGMENT_HEAD}
      varying vec2 vCorner;
      varying vec3 vColor;
      varying float vEnds;
      void main() {
        #include <logdepthbuf_fragment>
        float along = 1.0 - smoothstep(0.25, 1.0, abs(vCorner.x));
        float across = 1.0 - smoothstep(0.0, 1.0, abs(vCorner.y));
        gl_FragColor = vec4(vColor * along * across * vEnds * uFade, 1.0);
        #include <colorspace_fragment>
      }
    `,
  );
  const mesh = new Mesh(geometry, material);
  return { mesh, texture, cars: id - firstId };
}

/**
 * Windows rendered dark in the layer, lit here a few at a time: each a
 * screen-aligned rectangle with its edges antialiased (a box filter in
 * pixels, so a two-pixel window doesn't shimmer as the camera drifts). On
 * or off for a slot of 1.5–5 minutes, a coin toss a slot, crossfading
 * over WINDOWS.fade seconds; about half are lit at any time.
 */
function windows(list: CityWindow[], uniforms: CityUniforms, firstId: number) {
  const rect: number[] = [];
  const meta: number[] = [];
  const colors: number[] = [];
  const corners: Vector3[] = [];
  const color = new Color();
  list.forEach((w, i) => {
    const id = firstId + i;
    const [az0, az1] = w.az.map((a) => a * MathUtils.DEG2RAD);
    const [t0, t1] = w.el.map((e) => Math.tan(e * MathUtils.DEG2RAD));
    rect.push(az0, az1, t0, t1);
    const slot =
      WINDOWS.minSlot + (WINDOWS.maxSlot - WINDOWS.minSlot) * noise(id, 1);
    meta.push(w.r, slot, slot * noise(id, 2), id);
    color.set(w.color).multiplyScalar(0.7 + 0.3 * noise(id, 3));
    colors.push(color.r, color.g, color.b);
    corners.push(
      cityPoint(w.az[0], w.el[0], w.r),
      cityPoint(w.az[1], w.el[1], w.r),
    );
  });

  const geometry = unitQuad();
  geometry.setAttribute("aRect", instanced(rect, 4));
  geometry.setAttribute("aMeta", instanced(meta, 4));
  geometry.setAttribute("aColor", instanced(colors, 3));
  geometry.instanceCount = list.length;
  geometry.boundingSphere = new Sphere().setFromPoints(corners);

  const material = lightMaterial(
    uniforms,
    {},
    /* glsl */ `
      #include <common>
      #include <logdepthbuf_pars_vertex>
      ${PIXELS}
      uniform float uTime;
      // Azimuths (rad) and tan(elevation)s of the edges.
      attribute vec4 aRect;
      // Radius (m), slot length (s), clock offset (s), seed.
      attribute vec4 aMeta;
      attribute vec3 aColor;
      varying vec2 vPx;
      varying vec2 vHalf;
      varying vec3 vColor;
      varying float vOn;

      vec3 onCylinder(float az, float t, float r) {
        return vec3(r * sin(az), r * t, -r * cos(az));
      }

      // Integer hash (lowbias32) to [0, 1).
      float coin(uint seed, uint slot) {
        uint h = seed * 0x9E3779B9u ^ (slot + 0x7F4A7C15u) * 0x85EBCA6Bu;
        h ^= h >> 16u;
        h *= 0x7FEB352Du;
        h ^= h >> 15u;
        h *= 0x846CA68Bu;
        h ^= h >> 16u;
        return float(h >> 8u) / 16777216.0;
      }

      void main() {
        float r = aMeta.x;
        mat4 mvp = projectionMatrix * modelViewMatrix;
        vec4 a = mvp * vec4(onCylinder(aRect.x, aRect.z, r), 1.0);
        vec4 b = mvp * vec4(onCylinder(aRect.y, aRect.w, r), 1.0);
        vec4 c = mvp * vec4(
          onCylinder(0.5 * (aRect.x + aRect.y), 0.5 * (aRect.z + aRect.w), r),
          1.0
        );

        float clock = uTime + aMeta.z;
        float k = floor(clock / aMeta.y);
        uint seed = uint(aMeta.w);
        float now = step(coin(seed, uint(k) + 1u), 0.5);
        float before = step(coin(seed, uint(k)), 0.5);
        vOn = mix(before, now, smoothstep(0.0, ${WINDOWS.fade.toFixed(2)}, clock - k * aMeta.y));
        vColor = aColor;

        if (min(c.w, min(a.w, b.w)) <= 0.0) {
          vPx = vec2(0.0);
          vHalf = vec2(0.0);
          gl_Position = CLIPPED;
          return;
        }
        vec2 pa = toPixels(a);
        vec2 pb = toPixels(b);
        vHalf = abs(pb - pa) * 0.5;
        // A pixel of margin all round for the antialiased edge.
        vPx = position.xy * (vHalf + 1.0);
        gl_Position = fromPixels(0.5 * (pa + pb) + vPx, c);
        #include <logdepthbuf_vertex>
      }
    `,
    /* glsl */ `
      ${FRAGMENT_HEAD}
      varying vec2 vPx;
      varying vec2 vHalf;
      varying vec3 vColor;
      varying float vOn;
      void main() {
        #include <logdepthbuf_fragment>
        // How much of this pixel the window covers.
        vec2 cover = clamp(min(vPx + 0.5, vHalf) - max(vPx - 0.5, -vHalf), 0.0, 1.0);
        gl_FragColor = vec4(vColor * cover.x * cover.y * vOn * uFade, 1.0);
        #include <colorspace_fragment>
      }
    `,
  );
  return new Mesh(geometry, material);
}

export type CityView = {
  root: Group;
  credit: string;
  /** Draw calls the city adds (layers plus live touches). */
  draws: number;
  /**
   * Uploads the layers and compiles the shaders ahead of the first frame,
   * so the fade doesn't start with a hitch.
   */
  prepare: (
    renderer: WebGLRenderer,
    camera: Camera,
    scene: Scene,
  ) => Promise<void>;
  /**
   * Advances the live touches and the fade-in; call once a frame. True
   * while it fades in (it wants every frame until then).
   */
  tick: (dt: number, renderer: WebGLRenderer, reduced: boolean) => boolean;
  /** Hides the scene's stand-in view while the city is up; returns the undo. */
  replace: (stand: Object3D) => () => void;
  dispose: () => void;
};

const smoothstep = (t: number) => t * t * (3 - 2 * t);

/**
 * The city as three.js objects around `manifest.eye`, from its layer
 * textures (in manifest order, loaded unflipped). Layers are unlit and
 * drawn as rendered; opaque ones blend only while fading in. Live touches
 * draw right after the layer behind them, so a nearer layer covers them,
 * and the room covers everything through depth. Nothing here is pickable.
 */
export function buildCity(
  manifest: CityManifest,
  textures: Texture[],
): CityView {
  const root = new Group();
  root.name = "City";
  root.position.fromArray(manifest.eye);
  const owned: { dispose: () => void }[] = [];
  const own = <T extends { dispose: () => void }>(o: T) => {
    owned.push(o);
    return o;
  };

  const layers = manifest.layers.map((layer, i) => {
    const map = own(textures[i]);
    map.colorSpace = SRGBColorSpace;
    map.anisotropy = ANISOTROPY;
    // Blended while it fades in; nearer layers stay blended and out of the
    // depth buffer. Front faces only: every camera is inside the cylinder.
    const material = own(
      new MeshBasicMaterial({
        map,
        transparent: true,
        opacity: 0,
        depthWrite: !layer.alpha,
        toneMapped: false,
        fog: false,
      }),
    );
    const mesh = new Mesh(own(layerGeometry(layer)), material);
    mesh.name = `City_${layer.id}`;
    mesh.renderOrder = layerOrder(i);
    root.add(mesh);
    return { mesh, material, opaque: !layer.alpha };
  });

  const uniforms: CityUniforms = {
    uTime: { value: 0 },
    uFade: { value: 0 },
    uMotion: { value: 1 },
    uPixelRatio: { value: 1 },
    uResolution: { value: new Vector2(1, 1) },
  };

  // One draw per kind per slot (normally one slot: everything sits in
  // front of the far layer and behind the near one).
  const bySlot = <T extends { r: number }>(items: T[]) => {
    const slots = new Map<number, T[]>();
    for (const item of items) {
      const slot = slotOf(manifest.layers, item.r);
      slots.set(slot, [...(slots.get(slot) ?? []), item]);
    }
    return slots;
  };
  let id = 0;
  const touches: Object3D[] = [];
  for (const [slot, items] of bySlot(manifest.aviation)) {
    const points = aviationLights(items, uniforms);
    points.name = "City_aviation";
    points.renderOrder = touchOrder(slot);
    touches.push(points);
  }
  for (const [slot, items] of bySlot(manifest.traffic)) {
    const { mesh, texture, cars } = traffic(items, uniforms, id);
    own(texture);
    id += cars;
    mesh.name = "City_traffic";
    mesh.renderOrder = touchOrder(slot);
    touches.push(mesh);
  }
  for (const [slot, items] of bySlot(manifest.windows)) {
    const mesh = windows(items, uniforms, id);
    id += items.length;
    mesh.name = "City_windows";
    mesh.renderOrder = touchOrder(slot);
    touches.push(mesh);
  }
  for (const o of touches) {
    root.add(o);
    const { geometry, material } = o as Mesh;
    own(geometry);
    own(material as Material);
  }

  // The city is backdrop: no click or hover ever reaches it.
  root.traverse((o) => {
    o.raycast = noRaycast;
  });

  let shown = -1;
  let faded = false;
  const setFade = (k: number) => {
    for (const { material } of layers) material.opacity = k;
    uniforms.uFade.value = k;
  };

  return {
    root,
    credit: manifest.credit,
    draws: layers.length + touches.length,
    prepare: async (renderer, camera, scene) => {
      for (const texture of textures) renderer.initTexture(texture);
      await renderer.compileAsync(root, camera, scene);
    },
    tick: (dt, renderer, reduced) => {
      if (!reduced) uniforms.uTime.value += dt;
      uniforms.uMotion.value = reduced ? 0 : 1;
      uniforms.uPixelRatio.value = renderer.getPixelRatio();
      renderer.getDrawingBufferSize(uniforms.uResolution.value);
      if (faded) return false;
      shown = shown < 0 ? 0 : shown + dt;
      const k = reduced ? 1 : Math.min(1, shown / FADE);
      setFade(smoothstep(k));
      if (k < 1) return true;
      // Faded in: opaque layers leave the blended pass.
      faded = true;
      for (const { material, opaque } of layers) {
        if (!opaque) continue;
        material.transparent = false;
        material.needsUpdate = true;
      }
      return false;
    },
    replace: (stand) => {
      const was = stand.visible;
      stand.visible = false;
      return () => {
        stand.visible = was;
      };
    },
    dispose: () => {
      for (const o of owned) o.dispose();
      for (const t of textures) {
        const image = t.image as { close?: () => void } | null;
        image?.close?.();
      }
    },
  };
}
