import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import type { Object3D } from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";

type Json = { [key: string]: unknown };

/** Drops every texture reference from a material tree (keys like baseColorTexture). */
function dropTextures(value: unknown): void {
  if (!value || typeof value !== "object") return;
  for (const key of Object.keys(value)) {
    if (key.endsWith("Texture")) delete (value as Json)[key];
    else dropTextures((value as Json)[key]);
  }
}

/**
 * The GLB without its images: Node can't decode WebP, and the Workbench
 * tests only read the node graph. Rewrites the JSON chunk, keeps the binary.
 */
function withoutTextures(file: Buffer): ArrayBuffer {
  const jsonLength = file.readUInt32LE(12);
  const json = JSON.parse(
    file.subarray(20, 20 + jsonLength).toString("utf8"),
  ) as Json & { materials?: unknown[]; extensionsRequired?: string[] };
  delete json.textures;
  delete json.images;
  delete json.samplers;
  dropTextures(json.materials);
  json.extensionsRequired = json.extensionsRequired?.filter(
    (e) => e !== "EXT_texture_webp",
  );
  let text = JSON.stringify(json);
  text += " ".repeat((4 - (Buffer.byteLength(text) % 4)) % 4);
  const jsonChunk = Buffer.from(text, "utf8");
  const rest = file.subarray(20 + jsonLength);
  const out = Buffer.alloc(12 + 8 + jsonChunk.length + rest.length);
  file.copy(out, 0, 0, 12);
  out.writeUInt32LE(out.length, 8);
  out.writeUInt32LE(jsonChunk.length, 12);
  out.writeUInt32LE(0x4e4f534a, 16); // "JSON"
  jsonChunk.copy(out, 20);
  rest.copy(out, 20 + jsonChunk.length);
  return out.buffer.slice(out.byteOffset, out.byteOffset + out.byteLength);
}

/**
 * public/workbench/scene.glb, built locally from /assets (both kept out of
 * git: the scene holds third-party CAD meshes not cleared for publishing).
 * Tests that read it skip where it hasn't been built.
 */
export const SCENE_GLB = path.resolve(
  __dirname,
  "../../public/workbench/scene.glb",
);

export const hasSceneGlb = existsSync(SCENE_GLB);

/** The real scene file, parsed without its textures. */
export async function loadSceneGlb(): Promise<Object3D> {
  const file = readFileSync(SCENE_GLB);
  const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  const gltf = await loader.parseAsync(withoutTextures(file), "");
  return gltf.scene;
}
