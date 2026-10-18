/**
 * The recording formats, in the order the recorder tries them:
 * Opus in WebM (Chrome, Edge, Firefox 130+), AAC in MP4 (Safari), then
 * Opus in Ogg (older Firefox). The server takes exactly these containers.
 */
export const AUDIO_FORMATS = [
  { mime: "audio/webm;codecs=opus", base: "audio/webm", ext: "webm", label: "WebM/Opus" },
  { mime: "audio/mp4", base: "audio/mp4", ext: "m4a", label: "MP4/AAC" },
  { mime: "audio/ogg;codecs=opus", base: "audio/ogg", ext: "ogg", label: "Ogg/Opus" },
] as const;

export type AudioFormat = (typeof AUDIO_FORMATS)[number];
export type AudioBase = AudioFormat["base"];

/** "audio/webm;codecs=opus" -> "audio/webm": the container, without parameters. */
export function baseMime(type: string): string {
  return type.split(";")[0].trim().toLowerCase();
}

/** The allowed format a blob's type names, or undefined. */
export function formatOf(type: string): AudioFormat | undefined {
  const base = baseMime(type);
  return AUDIO_FORMATS.find((format) => format.base === base);
}

/** The first format this browser can record, or undefined. */
export function pickRecordingType(
  isTypeSupported: (type: string) => boolean,
): AudioFormat | undefined {
  return AUDIO_FORMATS.find((format) => {
    try {
      return isTypeSupported(format.mime);
    } catch {
      return false;
    }
  });
}
