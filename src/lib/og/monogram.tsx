import "server-only";
import { ImageResponse } from "next/og";
import { googleFont } from "./google-font";

const INK = "#1C1B19";
const PAPER = "#EDEAE3";
const ACCENT = "#FF4F00";

/**
 * The site icon: initials in Plex Mono on an ink plate, followed by the
 * hero's orange block cursor, a full character cell wide so it never
 * reads as a third letter at 16px. Everything scales from `px`, so the favicon
 * and the home-screen icon are the same drawing.
 */
export async function monogram(initials: string, px: number) {
  const mono = await googleFont("IBM Plex Mono", 500, initials);
  const fontSize = px * 0.44;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: px * 0.04,
          background: INK,
          color: PAPER,
          fontFamily: "IBM Plex Mono",
          fontSize,
          letterSpacing: -fontSize * 0.04,
        }}
      >
        <span>{initials}</span>
        <span style={{ width: fontSize * 0.6, height: fontSize * 0.72, background: ACCENT }} />
      </div>
    ),
    {
      width: px,
      height: px,
      fonts: [{ name: "IBM Plex Mono", data: mono, weight: 500, style: "normal" }],
    },
  );
}
