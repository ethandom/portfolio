import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { z } from "zod";

export const CONTENT_DIR = path.join(process.cwd(), "content");

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export type Entry<T> = T & { slug: string; body: string };

/** Parse one markdown file; throws with the file path and every bad field. */
export function parseFile<S extends z.ZodType<object>>(
  file: string,
  schema: S,
): Entry<z.infer<S>> {
  const raw = fs.readFileSync(file, "utf8");
  const { data, content } = matter(raw);
  const result = schema.safeParse(data);
  const rel = path.relative(process.cwd(), file);

  if (!result.success) {
    throw new Error(`Invalid content in ${rel}:\n${z.prettifyError(result.error)}`);
  }

  const slug = path.basename(file, ".md");
  if (!SLUG.test(slug)) {
    throw new Error(`Invalid content filename ${rel}: use kebab-case`);
  }

  return { ...result.data, slug, body: content.trim() };
}

/** Parse every .md file in a content subdirectory. */
export function parseDir<S extends z.ZodType<object>>(
  dir: string,
  schema: S,
): Entry<z.infer<S>>[] {
  const abs = path.join(CONTENT_DIR, dir);
  return fs
    .readdirSync(abs)
    .filter((f) => f.endsWith(".md"))
    .map((f) => parseFile(path.join(abs, f), schema));
}
