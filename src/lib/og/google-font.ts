import "server-only";
import { cacheLife } from "next/cache";

/**
 * One weight of a Google Font as TrueType, subset to `text`, for `next/og`
 * (it can't read woff2). Cached for good: the image routes render at build
 * time, and the subset only changes when the copy does.
 */
export async function googleFont(
  family: string,
  weight: number,
  text: string,
): Promise<ArrayBuffer> {
  "use cache";
  cacheLife("max");

  const glyphs = [...new Set(text)].join("");
  const query = new URLSearchParams({
    family: `${family}:wght@${weight}`,
    text: glyphs,
  });
  // Without a browser user agent, the CSS API answers with TrueType URLs.
  const css = await fetch(`https://fonts.googleapis.com/css2?${query}`).then(
    (res) => res.text(),
  );
  const url = css.match(/src: url\((.+?)\) format\('(?:truetype|opentype)'\)/)?.[1];
  if (!url) throw new Error(`No TrueType source for ${family} ${weight}`);

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Font fetch failed (${res.status}): ${family} ${weight}`);
  return res.arrayBuffer();
}
