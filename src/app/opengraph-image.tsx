import { ImageResponse } from "next/og";
import { siteConfig } from "@/config/site";
import { getProfile } from "@/lib/content";
import { googleFont } from "@/lib/og/google-font";

// Hex mirrors of tokens.css; `next/og` can't read CSS variables.
const PAPER = "#EDEAE3";
const INK = "#1C1B19";
const MUTED = "#625E56";
const ACCENT = "#FF4F00";
const LIVE = "#2BB673";
const CAUTION = "#F2C230";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const profile = getProfile();
export const alt = `${profile.name}: ${profile.oneLiner}`;

/**
 * The link preview: the hero, printed as a manual cover. Name, one-liner,
 * status, and the caution tape that closes every page.
 */
export default async function OpenGraphImage() {
  const { name, oneLiner, status } = getProfile();
  const head = "Operator's Manual";
  const label = [head, siteConfig.domain, status.label].join("").toUpperCase();

  const [light, regular, mono] = await Promise.all([
    googleFont("Inter", 300, name),
    googleFont("Inter", 400, oneLiner),
    googleFont("IBM Plex Mono", 500, label),
  ]);

  const labelStyle = {
    fontFamily: "IBM Plex Mono",
    fontSize: 22,
    letterSpacing: 2.5,
    textTransform: "uppercase" as const,
  };

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: PAPER,
          color: INK,
          fontFamily: "Inter",
        }}
      >
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: "64px 72px 56px",
          }}
        >
          <div
            style={{
              ...labelStyle,
              display: "flex",
              justifyContent: "space-between",
              paddingBottom: 20,
              borderBottom: `1px solid ${INK}`,
            }}
          >
            <span>{head}</span>
            <span>{siteConfig.domain}</span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <span style={{ fontWeight: 300, fontSize: 104, letterSpacing: -3, lineHeight: 1 }}>
                {name}
              </span>
              <span style={{ width: 44, height: 92, background: ACCENT }} />
            </div>
            <span style={{ fontSize: 42, color: MUTED, lineHeight: 1.2 }}>{oneLiner}</span>
          </div>

          <div style={{ ...labelStyle, display: "flex", alignItems: "center", gap: 16 }}>
            {status.available && (
              <span style={{ width: 16, height: 16, borderRadius: 8, background: LIVE }} />
            )}
            <span>{status.label}</span>
          </div>
        </div>

        <div
          style={{
            height: 28,
            backgroundImage: `repeating-linear-gradient(-45deg, ${CAUTION} 0 14px, ${INK} 14px 28px)`,
          }}
        />
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Inter", data: light, weight: 300, style: "normal" },
        { name: "Inter", data: regular, weight: 400, style: "normal" },
        { name: "IBM Plex Mono", data: mono, weight: 500, style: "normal" },
      ],
    },
  );
}
