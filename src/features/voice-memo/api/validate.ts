import "server-only";
import { z } from "zod";
import { formatOf, type AudioFormat } from "../lib/audio-format";
import {
  EMAIL_MAX,
  FIELD,
  MAX_AUDIO_BYTES,
  MAX_SECONDS_ACCEPTED,
  NAME_MAX,
  type VoiceMemoField,
} from "../lib/limits";

/** A memo that passed every check, ready to email. */
export type VoiceMemo = {
  name: string;
  email: string;
  seconds: number;
  audio: { bytes: Uint8Array; format: AudioFormat };
};

export type ParseResult =
  | { ok: true; honeypot: true }
  | { ok: true; honeypot: false; memo: VoiceMemo }
  | {
      ok: false;
      status: 400 | 413 | 415;
      error: "invalid" | "too_large" | "unsupported_audio";
      fields?: Partial<Record<VoiceMemoField, string>>;
    };

const schema = z.object({
  [FIELD.name]: z
    .string("Enter your name.")
    .trim()
    .min(1, "Enter your name.")
    .max(NAME_MAX, `Keep your name under ${NAME_MAX} characters.`)
    // No line breaks or other control characters: the name lands in the subject.
    .regex(/^[^\p{Cc}]*$/u, "Enter your name on one line."),
  [FIELD.email]: z
    .string("Enter your email.")
    .trim()
    .max(EMAIL_MAX, "That email is too long.")
    .pipe(z.email("Enter a valid email.")),
  [FIELD.duration]: z.coerce
    .number("Missing the recording length.")
    .finite()
    .positive("Missing the recording length.")
    .max(MAX_SECONDS_ACCEPTED, "Recordings can be up to 2 minutes."),
  [FIELD.audio]: z.file("Missing the recording.").min(1, "The recording is empty."),
});

/**
 * Which container the first bytes say this is, whatever the client claimed.
 * WebM starts with the EBML magic, Ogg with "OggS", MP4 with a box header
 * (Safari's fragmented MP4 opens with "ftyp").
 */
export function sniffContainer(bytes: Uint8Array): AudioFormat["base"] | undefined {
  const ascii = (from: number, to: number) =>
    String.fromCharCode(...bytes.subarray(from, to));
  if (bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3) {
    return "audio/webm";
  }
  if (ascii(0, 4) === "OggS") return "audio/ogg";
  if (["ftyp", "styp", "moov", "mdat", "free", "skip", "wide"].includes(ascii(4, 8))) {
    return "audio/mp4";
  }
  return undefined;
}

/**
 * Checks a submitted form. A filled honeypot short-circuits everything: the
 * caller answers as if it worked and sends nothing.
 */
export async function parseVoiceMemo(form: FormData): Promise<ParseResult> {
  const honeypot = form.get(FIELD.honeypot);
  if (typeof honeypot === "string" && honeypot.trim() !== "") {
    return { ok: true, honeypot: true };
  }

  const audio = form.get(FIELD.audio);
  if (audio instanceof File && audio.size > MAX_AUDIO_BYTES) {
    return { ok: false, status: 413, error: "too_large", fields: { audio: "The recording is too large." } };
  }

  const parsed = schema.safeParse({
    [FIELD.name]: form.get(FIELD.name) ?? undefined,
    [FIELD.email]: form.get(FIELD.email) ?? undefined,
    [FIELD.duration]: form.get(FIELD.duration) ?? undefined,
    [FIELD.audio]: audio ?? undefined,
  });
  if (!parsed.success) {
    const fields: Partial<Record<VoiceMemoField, string>> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] as VoiceMemoField;
      fields[key] ??= issue.message;
    }
    return { ok: false, status: 400, error: "invalid", fields };
  }

  const file = parsed.data[FIELD.audio];
  const format = formatOf(file.type);
  if (!format) {
    return { ok: false, status: 415, error: "unsupported_audio", fields: { audio: "That audio format isn't supported." } };
  }
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (sniffContainer(bytes) !== format.base) {
    return { ok: false, status: 415, error: "unsupported_audio", fields: { audio: "That file isn't the audio it claims to be." } };
  }

  return {
    ok: true,
    honeypot: false,
    memo: {
      name: parsed.data[FIELD.name],
      email: parsed.data[FIELD.email],
      seconds: parsed.data[FIELD.duration],
      audio: { bytes, format },
    },
  };
}
