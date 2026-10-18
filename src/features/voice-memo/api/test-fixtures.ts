/** Test helpers: tiny clips with real container headers, and memo forms. */
import { FIELD } from "../lib/limits";

const ascii = (s: string) => [...s].map((c) => c.charCodeAt(0));

/** The first bytes of each container, padded out to `size`. */
export function clipBytes(kind: "webm" | "mp4" | "ogg" | "junk", size = 64): Uint8Array {
  const head = {
    webm: [0x1a, 0x45, 0xdf, 0xa3, 0x9f, 0x42, 0x86, 0x81],
    mp4: [0x00, 0x00, 0x00, 0x1c, ...ascii("ftypM4A ")],
    ogg: ascii("OggS\0\x02\0\0"),
    junk: ascii("%PDF-1.7"),
  }[kind];
  const bytes = new Uint8Array(Math.max(size, head.length));
  bytes.set(head);
  return bytes;
}

export function clip(
  kind: "webm" | "mp4" | "ogg" | "junk" = "webm",
  type = "audio/webm;codecs=opus",
  size?: number,
): File {
  return new File([clipBytes(kind, size) as BlobPart], "voice-memo.bin", { type });
}

export function memoForm(
  overrides: Partial<Record<"name" | "email" | "duration" | "website", string>> & {
    audio?: File | string | null;
  } = {},
): FormData {
  const form = new FormData();
  const audio = overrides.audio === undefined ? clip() : overrides.audio;
  if (audio !== null) form.set(FIELD.audio, audio);
  form.set(FIELD.name, overrides.name ?? "Jane Doe");
  form.set(FIELD.email, overrides.email ?? "jane@example.com");
  form.set(FIELD.duration, overrides.duration ?? "42.5");
  form.set(FIELD.honeypot, overrides.website ?? "");
  return form;
}
