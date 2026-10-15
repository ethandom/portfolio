import {
  siC,
  siDeno,
  siGooglegemini,
  siHono,
  siHtml5,
  siLinux,
  siMake,
  siModelcontextprotocol,
  siPostgresql,
  siPython,
  siReact,
  siSpotify,
  siSupabase,
  siTypescript,
  siZod,
  type SimpleIcon,
} from "simple-icons";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/** A mark simple-icons doesn't carry: a filled path, or a stroked drawing. */
type Glyph = { viewBox: string; path?: string; draw?: ReactNode };

/** Devicon "playwright" (plain), MIT. */
const PLAYWRIGHT: Glyph = {
  viewBox: "0 0 128 128",
  path: "m72.086 86.132l-.594-.144c-13.125-3.844-15.15-14.311-15.15-14.311l18.182 5.082L84.15 39.77l-.116-.031c-11.807-3.162-19.64-8.692-22.744-11.292c-4.4-3.685-6.335-6.246-8.24-2.372c-1.682 3.417-3.836 8.977-5.92 16.762c-4.516 16.857-7.892 52.429 20.027 59.914l.572.129zm-18.807-30.85s4.4-6.843 11.862-4.722c7.467 2.121 8.045 10.376 8.045 10.376zm-8.517 23.451L31.787 82.41s1.41-8.029 10.968-11.212l-7.347-27.573l-.635.193c-9.111 2.457-16.476 1.805-19.55 1.273c-4.357-.751-6.636-1.708-6.422 1.606c.186 2.923.882 7.454 2.477 13.44c3.45 12.961 14.854 37.937 36.405 32.132l.635-.199zM19.548 60.315l15.316-4.035s-.446 5.892-6.188 7.405c-5.743 1.512-9.128-3.371-9.128-3.371zm89.824-18.979c-3.981.698-13.532 1.567-25.336-1.596c-11.807-3.162-19.64-8.692-22.744-11.292c-4.4-3.685-6.335-6.246-8.24-2.372c-1.684 3.417-3.837 8.977-5.921 16.762c-4.516 16.857-7.892 52.429 20.027 59.914c27.912 7.479 42.772-25.017 47.289-41.875c2.084-7.783 2.998-13.676 3.25-17.476c.287-4.305-2.67-3.055-8.324-2.064zM53.28 55.282s4.4-6.843 11.862-4.722c7.467 2.121 8.045 10.376 8.045 10.376zm18.215 30.706c-13.125-3.845-15.15-14.311-15.15-14.311l35.259 9.858c0-.002-7.117 8.25-20.109 4.453m12.466-21.51s4.394-6.838 11.854-4.711c7.46 2.124 8.048 10.379 8.048 10.379zM51.732 83.935v-7.179l-19.945 5.656s1.474-8.563 11.876-11.514c3.155-.894 5.846-.888 8.069-.459V40.995h9.987c-1.087-3.36-2.139-5.947-3.023-7.744c-1.461-2.975-2.96-1.003-6.361 1.842c-2.396 2.001-8.45 6.271-17.561 8.726c-9.111 2.457-16.476 1.805-19.55 1.273c-4.357-.752-6.636-1.708-6.422 1.605c.186 2.923.882 7.455 2.477 13.44c3.45 12.962 14.854 37.937 36.405 32.132c5.629-1.517 9.603-4.515 12.357-8.336h-8.309Zm-32.185-23.62l15.316-4.035s-.446 5.892-6.188 7.405c-5.743 1.512-9.128-3.371-9.128-3.371z",
};

/** Remix Icon "openai-fill", Apache-2.0: the ChatGPT knot. */
const OPENAI: Glyph = {
  viewBox: "0 0 24 24",
  path: "M20.562 10.188c.25-.688.313-1.376.25-2.063c-.062-.687-.312-1.375-.625-2c-.562-.937-1.375-1.687-2.312-2.125c-1-.437-2.063-.562-3.125-.312c-.5-.5-1.063-.938-1.688-1.25S11.687 2 11 2a5.17 5.17 0 0 0-3 .938c-.875.624-1.5 1.5-1.813 2.5c-.75.187-1.375.5-2 .875c-.562.437-1 1-1.375 1.562c-.562.938-.75 2-.625 3.063a5.44 5.44 0 0 0 1.25 2.874a4.7 4.7 0 0 0-.25 2.063c.063.688.313 1.375.625 2c.563.938 1.375 1.688 2.313 2.125c1 .438 2.062.563 3.125.313c.5.5 1.062.937 1.687 1.25S12.312 22 13 22a5.17 5.17 0 0 0 3-.937c.875-.625 1.5-1.5 1.812-2.5a4.54 4.54 0 0 0 1.938-.875c.562-.438 1.062-.938 1.375-1.563c.562-.937.75-2 .625-3.062c-.125-1.063-.5-2.063-1.188-2.876m-7.5 10.5c-1 0-1.75-.313-2.437-.875c0 0 .062-.063.125-.063l4-2.312a.5.5 0 0 0 .25-.25a.57.57 0 0 0 .062-.313V11.25l1.688 1v4.625a3.685 3.685 0 0 1-3.688 3.813M5 17.25c-.438-.75-.625-1.625-.438-2.5c0 0 .063.063.125.063l4 2.312a.56.56 0 0 0 .313.063c.125 0 .25 0 .312-.063l4.875-2.812v1.937l-4.062 2.375A3.7 3.7 0 0 1 7.312 19c-1-.25-1.812-.875-2.312-1.75M3.937 8.563a3.8 3.8 0 0 1 1.938-1.626v4.751c0 .124 0 .25.062.312a.5.5 0 0 0 .25.25l4.875 2.813l-1.687 1l-4-2.313a3.7 3.7 0 0 1-1.75-2.25c-.25-.937-.188-2.062.312-2.937M17.75 11.75l-4.875-2.812l1.687-1l4 2.312c.625.375 1.125.875 1.438 1.5s.5 1.313.437 2.063a3.7 3.7 0 0 1-.75 1.937c-.437.563-1 1-1.687 1.25v-4.75c0-.125 0-.25-.063-.312c0 0-.062-.126-.187-.188m1.687-2.5s-.062-.062-.125-.062l-4-2.313c-.125-.062-.187-.062-.312-.062s-.25 0-.313.062L9.812 9.688V7.75l4.063-2.375c.625-.375 1.312-.5 2.062-.5c.688 0 1.375.25 2 .688c.563.437 1.063 1 1.313 1.625s.312 1.375.187 2.062m-10.5 3.5l-1.687-1V7.063c0-.688.187-1.438.562-2C8.187 4.438 8.75 4 9.375 3.688a3.37 3.37 0 0 1 2.062-.313c.688.063 1.375.375 1.938.813c0 0-.063.062-.125.062l-4 2.313a.5.5 0 0 0-.25.25c-.063.125-.063.187-.063.312zm.875-2L12 9.5l2.187 1.25v2.5L12 14.5l-2.188-1.25z",
};

/** Claude, as claude.ai serves its own favicon (simple-icons' copy differs). */
const CLAUDE: Glyph = {
  viewBox: "0 0 248 248",
  path: "M52.4285 162.873L98.7844 136.879L99.5485 134.602L98.7844 133.334H96.4921L88.7237 132.862L62.2346 132.153L39.3113 131.207L17.0249 130.026L11.4214 128.844L6.2 121.873L6.7094 118.447L11.4214 115.257L18.171 115.847L33.0711 116.911L55.485 118.447L71.6586 119.392L95.728 121.873H99.5485L100.058 120.337L98.7844 119.392L97.7656 118.447L74.5877 102.732L49.4995 86.1905L36.3823 76.62L29.3779 71.7757L25.8121 67.2858L24.2839 57.3608L30.6515 50.2716L39.3113 50.8623L41.4763 51.4531L50.2636 58.1879L68.9842 72.7209L93.4357 90.6804L97.0015 93.6343L98.4374 92.6652L98.6571 91.9801L97.0015 89.2625L83.757 65.2772L69.621 40.8192L63.2534 30.6579L61.5978 24.632C60.9565 22.1032 60.579 20.0111 60.579 17.4246L67.8381 7.49965L71.9133 6.19995L81.7193 7.49965L85.7946 11.0443L91.9074 24.9865L101.714 46.8451L116.996 76.62L121.453 85.4816L123.873 93.6343L124.764 96.1155H126.292V94.6976L127.566 77.9197L129.858 57.3608L132.15 30.8942L132.915 23.4505L136.608 14.4708L143.994 9.62643L149.725 12.344L154.437 19.0788L153.8 23.4505L150.998 41.6463L145.522 70.1215L141.957 89.2625H143.994L146.414 86.7813L156.093 74.0206L172.266 53.698L179.398 45.6635L187.803 36.802L193.152 32.5484H203.34L210.726 43.6549L207.415 55.1159L196.972 68.3492L188.312 79.5739L175.896 96.2095L168.191 109.585L168.882 110.689L170.738 110.53L198.755 104.504L213.91 101.787L231.994 98.7149L240.144 102.496L241.036 106.395L237.852 114.311L218.495 119.037L195.826 123.645L162.07 131.592L161.696 131.893L162.137 132.547L177.36 133.925L183.855 134.279H199.774L229.447 136.524L237.215 141.605L241.8 147.867L241.036 152.711L229.065 158.737L213.019 154.956L175.45 145.977L162.587 142.787H160.805V143.85L171.502 154.366L191.242 172.089L215.82 195.011L217.094 200.682L213.91 205.172L210.599 204.699L188.949 188.394L180.544 181.069L161.696 165.118H160.422V166.772L164.752 173.152L187.803 207.771L188.949 218.405L187.294 221.832L181.308 223.959L174.813 222.777L161.187 203.754L147.305 182.486L136.098 163.345L134.745 164.2L128.075 235.42L125.019 239.082L117.887 241.8L111.902 237.31L108.718 229.984L111.902 215.452L115.722 196.547L118.779 181.541L121.58 162.873L123.291 156.636L123.14 156.219L121.773 156.449L107.699 175.752L86.304 204.699L69.3663 222.777L65.291 224.431L58.2867 220.768L58.9235 214.27L62.8713 208.48L86.304 178.705L100.44 160.155L109.551 149.507L109.462 147.967L108.959 147.924L46.6977 188.512L35.6182 189.93L30.7788 185.44L31.4156 178.115L33.7079 175.752L52.4285 162.873Z",
};

/** Devicon "java" (original), MIT: the cup in Java's own blue and red. */
const JAVA: Glyph = {
  viewBox: "0 0 128 128",
  draw: (
    <>
      <path fill="#0074BD" d="M47.617 98.12s-4.767 2.774 3.397 3.71c9.892 1.13 14.947.968 25.845-1.092 0 0 2.871 1.795 6.873 3.351-24.439 10.47-55.308-.607-36.115-5.969zm-2.988-13.665s-5.348 3.959 2.823 4.805c10.567 1.091 18.91 1.18 33.354-1.6 0 0 1.993 2.025 5.132 3.131-29.542 8.64-62.446.68-41.309-6.336z" />
      <path fill="#EA2D2E" d="M69.802 61.271c6.025 6.935-1.58 13.17-1.58 13.17s15.289-7.891 8.269-17.777c-6.559-9.215-11.587-13.792 15.635-29.58 0 .001-42.731 10.67-22.324 34.187z" />
      <path fill="#0074BD" d="M102.123 108.229s3.529 2.91-3.888 5.159c-14.102 4.272-58.706 5.56-71.094.171-4.451-1.938 3.899-4.625 6.526-5.192 2.739-.593 4.303-.485 4.303-.485-4.953-3.487-32.013 6.85-13.743 9.815 49.821 8.076 90.817-3.637 77.896-9.468zM49.912 70.294s-22.686 5.389-8.033 7.348c6.188.828 18.518.638 30.011-.326 9.39-.789 18.813-2.474 18.813-2.474s-3.308 1.419-5.704 3.053c-23.042 6.061-67.544 3.238-54.731-2.958 10.832-5.239 19.644-4.643 19.644-4.643zm40.697 22.747c23.421-12.167 12.591-23.86 5.032-22.285-1.848.385-2.677.72-2.677.72s.688-1.079 2-1.543c14.953-5.255 26.451 15.503-4.823 23.725 0-.002.359-.327.468-.617z" />
      <path fill="#EA2D2E" d="M76.491 1.587S89.459 14.563 64.188 34.51c-20.266 16.006-4.621 25.13-.007 35.559-11.831-10.673-20.509-20.07-14.688-28.815C58.041 28.42 81.722 22.195 76.491 1.587z" />
      <path fill="#0074BD" d="M52.214 126.021c22.476 1.437 57-.8 57.817-11.436 0 0-1.571 4.032-18.577 7.231-19.186 3.612-42.854 3.191-56.887.874 0 .001 2.875 2.381 17.647 3.331z" />
    </>
  ),
};

/* Drawn for tools with no mark: a soup tureen, a matrix, a tiny network. */
const SOUP: Glyph = {
  viewBox: "0 0 24 24",
  draw: (
    <>
      <path d="M3.5 11h17a8.5 8.5 0 0 1-17 0Z" fill="currentColor" />
      <path d="M8.5 21h7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      {[8, 12, 16].map((x) => (
        <path
          key={x}
          d={`M${x} 8.5c-1-1 1-1.75 0-2.75s1-1.75 0-2.75`}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.25"
          strokeLinecap="round"
        />
      ))}
    </>
  ),
};

const MATRIX: Glyph = {
  viewBox: "0 0 24 24",
  draw: (
    <>
      <path d="M7 3.5H4.5v17H7M17 3.5h2.5v17H17" fill="none" stroke="currentColor" strokeWidth="1.5" />
      {[8.5, 12, 15.5].flatMap((y) =>
        [8.5, 12, 15.5].map((x) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r="1.15" fill="currentColor" />
        )),
      )}
    </>
  ),
};

const NET_LAYERS = [
  [8, 16],
  [5.5, 12, 18.5],
  [12],
].map((ys, i) => ys.map((y) => ({ x: 4.5 + i * 7.5, y })));

const NETWORK: Glyph = {
  viewBox: "0 0 24 24",
  draw: (
    <>
      {NET_LAYERS.slice(0, -1).flatMap((layer, i) =>
        layer.flatMap((a) =>
          NET_LAYERS[i + 1].map((b) => (
            <line
              key={`${a.x}${a.y}-${b.x}${b.y}`}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke="currentColor"
              strokeWidth="0.9"
              strokeOpacity="0.75"
            />
          )),
        ),
      )}
      {NET_LAYERS.flat().map((n) => (
        <circle key={`${n.x}-${n.y}`} cx={n.x} cy={n.y} r="2" fill="currentColor" />
      ))}
    </>
  ),
};

/**
 * Every tool a `stack` in /content names: what it does, and its mark.
 * Keyed by the exact name the content uses; an unknown name still prints,
 * as a two-letter monogram on an ink cap.
 * Tools without a mark in simple-icons get a printed monogram instead,
 * in the brand color when the brand has one (`hex`).
 */
const PARTS: Record<
  string,
  { role: string; icon?: SimpleIcon; glyph?: Glyph; mono?: string; hex?: string }
> = {
  TypeScript: { role: "Language", icon: siTypescript },
  Hono: { role: "HTTP framework", icon: siHono },
  Zod: { role: "Schema validation", icon: siZod },
  PostgreSQL: { role: "Database", icon: siPostgresql },
  Deno: { role: "Runtime, tests", icon: siDeno },
  Playwright: { role: "Browser automation", glyph: PLAYWRIGHT, hex: "2EAD33" },
  "OpenAI API": { role: "LLM API", glyph: OPENAI, hex: "000000" },
  MCP: { role: "Agent protocol", icon: siModelcontextprotocol },
  C: { role: "Language", icon: siC },
  Python: { role: "Language", icon: siPython },
  "Beautiful Soup": { role: "HTML parsing", glyph: SOUP },
  HTML: { role: "Markup", icon: siHtml5 },
  ChatGPT: { role: "LLM", glyph: OPENAI, hex: "000000" },
  Java: { role: "Language", glyph: JAVA, hex: "FFFFFF" },
  "Linear Algebra": { role: "Math", glyph: MATRIX },
  "Machine Learning": { role: "Field", glyph: NETWORK },
  "Linux Kernel": { role: "Module target", icon: siLinux },
  USB: { role: "Bus", mono: "USB" },
  FTDI: { role: "FT232R bridge", mono: "FT" },
  Make: { role: "Build", icon: siMake },
  "React Native": { role: "Mobile UI", icon: siReact },
  Supabase: { role: "Backend, cache", icon: siSupabase },
  "Gemini API": { role: "Multimodal LLM", icon: siGooglegemini },
  "Spotify API": { role: "Music data", icon: siSpotify },
  "Claude Code": { role: "Coding agent", glyph: CLAUDE, hex: "D97757" },
  Codex: { role: "Coding agent", glyph: OPENAI, hex: "000000" },
};

export function partRole(name: string) {
  return PARTS[name]?.role ?? "Component";
}

/** WCAG relative luminance of a 6-digit hex color. */
function luminance(hex: string) {
  const [r, g, b] = [0, 2, 4].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * A tool's mark on a keycap in its brand color, so the bill of materials
 * reads at a glance. The glyph is white or graphite, whichever contrasts
 * more with the cap. Tools with no brand color get an ink cap.
 */
export function StackMark({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  const part = PARTS[name];
  const brand = part?.icon?.hex ?? part?.hex;
  // Black brands (Deno, MCP, OpenAI) print on the ink plate instead, which
  // inverts to bone in Night Shift; a black cap there loses its edge.
  const hex = brand && luminance(brand) >= 0.02 ? brand : undefined;
  const l = hex ? luminance(hex) : 0;
  // Contrast against white vs. graphite (#1C1B19, L ≈ 0.011).
  const darkGlyph = hex !== undefined && (l + 0.05) / 0.061 > 1.05 / (l + 0.05);

  return (
    <span
      aria-hidden
      className={cn(
        "inline-grid size-9 shrink-0 place-items-center rounded-xs",
        hex
          ? darkGlyph
            ? "text-(--tape-ink)"
            : "text-(--on-brand)"
          : "bg-inverse text-ink-inverse",
        // A white cap needs an edge on Day paper.
        hex && l > 0.9 && "border border-hairline",
        className,
      )}
      style={hex ? { backgroundColor: `#${hex}` } : undefined}
    >
      {part?.icon ? (
        <svg viewBox="0 0 24 24" className="size-5 fill-current">
          <path d={part.icon.path} />
        </svg>
      ) : part?.glyph ? (
        <svg viewBox={part.glyph.viewBox} className="size-5 fill-current">
          {part.glyph.path ? <path d={part.glyph.path} /> : part.glyph.draw}
        </svg>
      ) : (
        <span className="font-mono text-[0.625rem] leading-none font-medium tracking-normal">
          {part?.mono ?? name.slice(0, 2).toUpperCase()}
        </span>
      )}
    </span>
  );
}
