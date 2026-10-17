"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { Led } from "@/components/manual";
import { prefersReducedMotion, useReducedMotion } from "@/components/motion";
import { cn } from "@/lib/cn";
import {
  CHANNELS,
  DEVICE,
  bit,
  complete,
  hex,
  run,
  type Line,
} from "@/lib/relayctl";

/* ---------------------------------------------------------------- board -- */

const W = 520;
const H = 372;
const CH = Array.from({ length: CHANNELS }, (_, i) => i + 1);

/*
 * Layout follows the real 8-channel board: USB-B on top, two columns of four
 * relays, screw terminals down both edges, an indicator LED beside each relay.
 * K1 sits bottom right and K8 bottom left; the right column counts up, the
 * left column down.
 */
const RELAY_W = 104;
const RELAY_H = 58;
const rowY = (row: number) => 80 + row * 66;
function place(n: number) {
  const right = n <= 4;
  const y = rowY(right ? 4 - n : n - 5);
  return {
    right,
    y,
    relayX: right ? 346 : 70,
    ledX: right ? 328 : 184,
    labelX: right ? 320 : 200,
  };
}

const BLUE = "color-mix(in oklab, var(--diagram) 42%, var(--surface))";
const BLUE_EDGE = "color-mix(in oklab, var(--diagram) 55%, var(--bg))";
const GREEN = "color-mix(in oklab, var(--live) 34%, var(--surface))";
const GREEN_EDGE = "color-mix(in oklab, var(--live) 45%, var(--bg))";
const HOLES = [
  [44, 54],
  [476, 54],
  [44, 352],
  [476, 352],
];

/** The clickable part of channel n: its relay, LED and label. */
function hitArea(n: number) {
  const { right, y } = place(n);
  const x0 = right ? 314 : 70;
  return {
    left: `${(x0 / W) * 100}%`,
    width: `${(136 / W) * 100}%`,
    top: `${((y - 3) / H) * 100}%`,
    height: `${((RELAY_H + 6) / H) * 100}%`,
  };
}

/** A screw-terminal strip: three screws (NO, COM, NC) per relay. */
function TerminalStrip({ x }: { x: number }) {
  return (
    <g>
      <rect
        x={x + 0.5}
        y="76.5"
        width="28"
        height="266"
        rx="2"
        fill={GREEN}
        stroke={GREEN_EDGE}
      />
      {[0, 1, 2, 3].flatMap((row) =>
        [10, 29, 48].map((dy) => {
          const cy = rowY(row) + dy;
          return (
            <g key={`${row}-${dy}`}>
              <circle cx={x + 14.5} cy={cy} r="6.5" fill="var(--ink-muted)" />
              <line
                x1={x + 10.5}
                y1={cy + 4}
                x2={x + 18.5}
                y2={cy - 4}
                stroke="var(--bg)"
                strokeWidth="1.5"
              />
            </g>
          );
        }),
      )}
    </g>
  );
}

/**
 * The board, drawn after the real part but quieter: Night Shift tokens keep
 * it a dark board on either paper, and the relays and terminals carry only a
 * tint of their real blue and green. A channel that's on lights its LED and
 * edges its relay in signal orange.
 */
function Board({ mask }: { mask: number }) {
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      aria-hidden
      className="block h-auto w-full font-mono select-none"
    >
      {/* PCB */}
      <rect
        x="28.5"
        y="38.5"
        width="463"
        height="326"
        rx="6"
        fill="var(--surface)"
        stroke="var(--rule)"
      />
      {HOLES.map(([x, y]) => (
        <circle
          key={`${x}-${y}`}
          cx={x}
          cy={y}
          r="5"
          fill="var(--bg)"
          stroke="var(--ink-muted)"
          strokeWidth="1.5"
        />
      ))}

      {/* USB-B socket, overhanging the top edge */}
      <rect
        x="230"
        y="4"
        width="60"
        height="62"
        rx="2"
        fill="var(--ink-muted)"
      />
      <rect x="241" y="14" width="38" height="30" fill="var(--bg)" />
      <rect x="250" y="22" width="20" height="10" fill="var(--ink-muted)" />

      {/* Power LED */}
      <rect x="302" y="74" width="10" height="6" rx="1" fill="var(--live)" />
      <text
        x="307"
        y="92"
        textAnchor="middle"
        fontSize="7"
        fill="var(--ink-muted)"
        letterSpacing="0.1em"
      >
        PWR
      </text>

      {/* Resistor row under the socket */}
      {Array.from({ length: 6 }, (_, i) => (
        <rect
          key={i}
          x={229 + i * 11}
          y="84"
          width="6"
          height="12"
          rx="0.5"
          fill="var(--sunken)"
          stroke="var(--ink-muted)"
          strokeWidth="0.75"
        />
      ))}

      {/* FT232R bridge: a square package with pins on four sides */}
      {Array.from({ length: 6 }, (_, i) => {
        const t = 133 + i * 6;
        return (
          <g key={i} stroke="var(--ink-muted)" strokeWidth="1.5">
            <line x1={t + 104} y1="124" x2={t + 104} y2="128" />
            <line x1={t + 104} y1="166" x2={t + 104} y2="170" />
            <line x1="236" y1={t - 2} x2="240" y2={t - 2} />
            <line x1="280" y1={t - 2} x2="284" y2={t - 2} />
          </g>
        );
      })}
      <rect x="240" y="128" width="40" height="38" fill="var(--bg)" />
      <circle cx="245.5" cy="133.5" r="1.5" fill="var(--hairline)" />
      <text
        x="260"
        y="186"
        textAnchor="middle"
        fontSize="7"
        fill="var(--ink-muted)"
        letterSpacing="0.06em"
      >
        FT232R
      </text>

      {/* Relay driver */}
      {Array.from({ length: 7 }, (_, i) => (
        <g key={i} stroke="var(--ink-muted)" strokeWidth="1.5">
          <line x1={240 + i * 6.5} y1="212" x2={240 + i * 6.5} y2="216" />
          <line x1={240 + i * 6.5} y1="238" x2={240 + i * 6.5} y2="242" />
        </g>
      ))}
      <rect x="234" y="216" width="52" height="22" fill="var(--bg)" />
      <text
        x="260"
        y="256"
        textAnchor="middle"
        fontSize="7"
        fill="var(--ink-muted)"
        letterSpacing="0.06em"
      >
        U2
      </text>

      <text
        x="260"
        y="330"
        textAnchor="middle"
        fontSize="7"
        fill="var(--ink-muted)"
        letterSpacing="0.14em"
      >
        USB RELAY · 8CH · 5V
      </text>

      <TerminalStrip x={34} />
      <TerminalStrip x={458} />

      {CH.map((n) => {
        const on = Boolean(mask & bit(n));
        const { right, y, relayX, ledX, labelX } = place(n);
        const mid = y + RELAY_H / 2;
        return (
          <g key={n}>
            {/* Relay can */}
            <rect
              x={relayX + 0.5}
              y={y + 0.5}
              width={RELAY_W}
              height={RELAY_H}
              rx="2"
              fill={BLUE}
              stroke={on ? "var(--accent)" : BLUE_EDGE}
              strokeWidth={on ? 1.5 : 1}
              className="transition-[stroke] duration-(--dur-fast) ease-out"
            />
            <g fill="var(--ink)" fillOpacity="0.7" textAnchor="middle">
              <text
                x={relayX + RELAY_W / 2}
                y={y + 22}
                fontSize="6.5"
                letterSpacing="0.04em"
              >
                10A 250VAC 10A 125VAC
              </text>
              <text
                x={relayX + RELAY_W / 2}
                y={y + 44}
                fontSize="8"
                letterSpacing="0.04em"
              >
                SRD-05VDC-SL-C
              </text>
            </g>

            {/* Indicator LED */}
            <rect
              x={ledX + 0.5}
              y={mid - 6.5}
              width="8"
              height="13"
              rx="1"
              fill={on ? "var(--accent)" : "var(--bg)"}
              stroke={on ? "var(--accent)" : "var(--rule)"}
              className={cn(
                "transition-[fill,stroke] duration-(--dur-fast) ease-out",
                on && "animate-[led-warm_var(--dur-base)_linear]",
              )}
            />
            <text
              x={labelX}
              y={mid + 3.5}
              textAnchor={right ? "end" : "start"}
              fontSize="10"
              fill={on ? "var(--ink)" : "var(--ink-muted)"}
              letterSpacing="0.06em"
            >
              K{n}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/* ------------------------------------------------------------- terminal -- */

type Row = {
  id: number;
  kind: "cmd" | "out";
  text: string;
  tone: Line["tone"];
  hang?: number;
};

/** What the board does on its own before anyone types. */
const SCRIPT = [
  "relayctl ping",
  "relayctl set 1 on",
  "relayctl set 3 on",
  "relayctl toggle 8",
  "relayctl write-mask 0xA5",
  "relayctl toggle 1",
  "relayctl getall",
];
const HINT = "# your turn: try toggle 2, write-mask 0xFF or help";
const MAX_ROWS = 160;

const TONE: Record<Line["tone"], string> = {
  out: "text-ink",
  ok: "text-live-text",
  err: "text-error",
  dim: "text-ink-muted",
};

let rowId = 0;
const rowsFor = (cmd: string, lines: Line[]): Row[] => [
  { id: rowId++, kind: "cmd", text: cmd, tone: "out" },
  ...lines.map((l) => ({ id: rowId++, kind: "out" as const, ...l })),
];

/** The whole demo session, played instantly: the server HTML and the reduced-motion state. */
function transcript() {
  let mask = 0;
  const rows: Row[] = [];
  for (const cmd of SCRIPT) {
    const r = run(cmd, mask);
    mask = r.mask;
    rows.push(...rowsFor(cmd, r.lines));
  }
  rows.push({ id: rowId++, kind: "out", text: HINT, tone: "dim" });
  return { rows, mask };
}

const FINAL = transcript();
/** The view line from lib/motion: only blocks still below it get a start state. */
const VIEW_LINE = 0.88;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Fig.: the relay board and a relayctl session wired to it. The session plays
 * itself once when it scrolls into view; a click, a keypress or a relay takes
 * over and leaves a live prompt. Typed commands drive the board.
 */
export function RelayRig({ figure }: { figure: string }) {
  const reduced = useReducedMotion();
  const [rows, setRows] = useState<Row[]>(FINAL.rows);
  const [mask, setMask] = useState(FINAL.mask);
  const [phase, setPhase] = useState<"armed" | "playing" | "ready">("ready");
  const [typing, setTyping] = useState("");
  const [input, setInput] = useState("");
  const [caret, setCaret] = useState(0);
  const [focused, setFocused] = useState(false);
  const maskRef = useRef(mask);
  const abort = useRef(false);
  const history = useRef<string[]>([]);
  const recall = useRef(-1);
  const moveCaret = useRef(false);
  const frame = useRef<HTMLDivElement>(null);
  const body = useRef<HTMLDivElement>(null);
  const field = useRef<HTMLInputElement>(null);

  const exec = useCallback((cmd: string) => {
    const r = run(cmd, maskRef.current);
    maskRef.current = r.mask;
    setMask(r.mask);
    setRows((prev) =>
      r.clear ? [] : [...prev, ...rowsFor(cmd, r.lines)].slice(-MAX_ROWS),
    );
  }, []);

  // Below the view line at load: clear to a blank session and wait for it.
  useEffect(() => {
    const el = frame.current;
    if (!el || prefersReducedMotion()) return;
    if (el.getBoundingClientRect().top < window.innerHeight * VIEW_LINE) return;
    maskRef.current = 0;
    setMask(0);
    setRows([]);
    setPhase("armed");
  }, []);

  // Arm → play once the terminal is actually on screen (an edge-on page in the book isn't).
  useEffect(() => {
    if (phase !== "armed") return;
    const el = frame.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.intersectionRatio >= 0.6) {
          io.disconnect();
          setPhase("playing");
        }
      },
      { threshold: [0, 0.6, 1] },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [phase]);

  // The demo session.
  useEffect(() => {
    if (phase !== "playing") return;
    abort.current = false;
    (async () => {
      await sleep(400);
      for (const cmd of SCRIPT) {
        for (let i = 1; i <= cmd.length; i++) {
          if (abort.current) return;
          setTyping(cmd.slice(0, i));
          await sleep(cmd[i - 1] === " " ? 70 : 28 + Math.random() * 36);
        }
        await sleep(240);
        if (abort.current) return;
        setTyping("");
        exec(cmd);
        await sleep(620);
      }
      if (abort.current) return;
      setRows((prev) => [
        ...prev,
        { id: rowId++, kind: "out", text: HINT, tone: "dim" },
      ]);
      setPhase("ready");
    })();
    return () => {
      abort.current = true;
    };
  }, [phase, exec]);

  // Reduced motion mid-session: finish at once.
  useEffect(() => {
    if (reduced && phase !== "ready") takeOver(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduced]);

  // Keep the newest line in view, inside the terminal only (never the page).
  useLayoutEffect(() => {
    const el = body.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
    fadeTop(el);
  }, [rows, typing, phase]);

  useLayoutEffect(() => {
    if (!moveCaret.current) return;
    moveCaret.current = false;
    field.current?.setSelectionRange(input.length, input.length);
  }, [input]);

  /** Stop the demo where it is and hand over the prompt. */
  function takeOver(focus = true) {
    if (phase !== "ready") {
      abort.current = true;
      setTyping("");
      if (phase === "armed") {
        maskRef.current = FINAL.mask;
        setMask(FINAL.mask);
        setRows(FINAL.rows);
      }
      setPhase("ready");
    }
    if (!focus) return;
    // Already live: focus now, so the first keystroke lands. Otherwise after the input mounts.
    if (field.current) field.current.focus({ preventScroll: true });
    else
      requestAnimationFrame(() =>
        field.current?.focus({ preventScroll: true }),
      );
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    // Replaced text puts the caret at its end, once React has written it.
    const sync = (value: string) => {
      moveCaret.current = true;
      setInput(value);
      setCaret(value.length);
    };
    if (e.key === "Enter") {
      e.preventDefault();
      const cmd = input.trim();
      if (cmd) {
        history.current.push(cmd);
        exec(cmd);
      } else {
        setRows((prev) => [
          ...prev,
          { id: rowId++, kind: "cmd", text: "", tone: "out" },
        ]);
      }
      recall.current = -1;
      sync("");
    } else if (e.key === "ArrowUp" || e.key === "ArrowDown") {
      const h = history.current;
      if (!h.length) return;
      e.preventDefault();
      const at = recall.current === -1 ? h.length : recall.current;
      const next = e.key === "ArrowUp" ? Math.max(0, at - 1) : at + 1;
      recall.current = next >= h.length ? -1 : next;
      sync(recall.current === -1 ? "" : h[recall.current]);
    } else if (e.key === "Tab" && !e.shiftKey) {
      const done = complete(input);
      // Only keep Tab when it completes something; otherwise it moves focus on.
      if (done !== input) {
        e.preventDefault();
        sync(done);
      }
    } else if (e.ctrlKey && e.key.toLowerCase() === "l") {
      e.preventDefault();
      setRows([]);
    } else if (e.ctrlKey && e.key.toLowerCase() === "c") {
      e.preventDefault();
      setRows((prev) => [
        ...prev,
        { id: rowId++, kind: "cmd", text: `${input}^C`, tone: "out" },
      ]);
      sync("");
    }
  }

  const ready = phase === "ready";
  const blink = ready && !reduced;

  return (
    <div
      ref={frame}
      className="flex flex-1 flex-col border border-strong bg-surface"
    >
      {/* Title strip */}
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b border-hairline px-3 py-2 font-mono text-label uppercase">
        <span className="flex items-center gap-3">
          <span className="bg-inverse px-1.5 py-0.5 text-ink-inverse">
            Fig. {figure}
          </span>
          <span className="text-ink">Relay board</span>
        </span>
        <span className="text-ink-muted tabular-nums">
          Mask <span className="text-ink">{hex(mask)}</span>
        </span>
      </div>

      {/* The board; each relay is also a switch */}
      <div className="px-3 py-5 sm:px-6 sm:py-6">
        <div data-theme="dark" className="relative">
          <Board mask={mask} />
          {CH.map((n) => {
            const on = Boolean(mask & bit(n));
            return (
              <button
                key={n}
                type="button"
                aria-pressed={on}
                aria-label={`Relay K${n}`}
                onClick={() => {
                  takeOver(false);
                  exec(`relayctl toggle ${n}`);
                }}
                className="absolute cursor-pointer"
                style={hitArea(n)}
              />
            );
          })}
        </div>
      </div>

      {/* relayctl session */}
      <div
        data-theme="dark"
        onClick={() => {
          if (window.getSelection()?.isCollapsed !== false) takeOver();
        }}
        className="flex flex-1 cursor-text flex-col border-t border-strong bg-bg font-mono text-ink focus-within:outline-2 focus-within:-outline-offset-2 focus-within:outline-accent"
      >
        <div className="flex items-center justify-between gap-4 border-b border-hairline px-3 py-1.5 text-label text-ink-muted uppercase">
          <span>{DEVICE}</span>
          <span className="flex items-center gap-2">
            {ready ? (
              <>
                <Led state="live" />
                {focused ? "Live" : "Ready"}
              </>
            ) : (
              <>
                <Led state="accent" />
                Demo<span className="max-sm:hidden"> · click to take over</span>
              </>
            )}
          </span>
        </div>
        {/* On wide screens the log is pinned inside this box, so its lines never stretch the page. */}
        <div className="relative lg:min-h-48 lg:flex-1">
          <div
            ref={body}
            role="log"
            onScroll={(e) => fadeTop(e.currentTarget)}
            aria-live={ready ? "polite" : "off"}
            aria-label="relayctl session"
            className="h-48 overflow-y-auto overscroll-contain data-[clipped=true]:mask-[linear-gradient(to_bottom,transparent,black_2.25rem)] lg:absolute lg:inset-0 lg:h-auto px-3 py-2.5 text-[0.8125rem] leading-[1.55] [scrollbar-color:var(--rule)_transparent] [scrollbar-width:thin] sm:text-sm"
          >
            {rows.map((row) => (
              <div
                key={row.id}
                // Wrap at words; help rows hang under their description column.
                style={
                  row.hang
                    ? {
                        paddingLeft: `${row.hang}ch`,
                        textIndent: `-${row.hang}ch`,
                      }
                    : undefined
                }
                className={cn(
                  "whitespace-pre-wrap wrap-break-word",
                  TONE[row.tone],
                )}
              >
                {row.kind === "cmd" && (
                  <span className="text-accent-text">$ </span>
                )}
                {row.text}
              </div>
            ))}

            {/* Prompt */}
            <div className="flex whitespace-pre">
              <span aria-hidden className="text-accent-text">
                ${" "}
              </span>
              {ready ? (
                <label className="relative min-w-0 flex-1">
                  <span className="sr-only">relayctl command</span>
                  <input
                    ref={field}
                    value={input}
                    maxLength={40}
                    spellCheck={false}
                    autoCapitalize="off"
                    autoComplete="off"
                    autoCorrect="off"
                    enterKeyHint="send"
                    onChange={(e) => {
                      setInput(e.target.value);
                      setCaret(
                        e.target.selectionStart ?? e.target.value.length,
                      );
                    }}
                    onSelect={(e) =>
                      setCaret(e.currentTarget.selectionStart ?? 0)
                    }
                    onKeyDown={onKeyDown}
                    onFocus={() => setFocused(true)}
                    onBlur={() => setFocused(false)}
                    className="w-full bg-transparent p-0 text-inherit outline-none [caret-color:transparent] focus-visible:shadow-none!"
                  />
                  <Cursor
                    at={caret}
                    char={input[caret]}
                    blink={blink}
                    hollow={!focused}
                  />
                </label>
              ) : (
                <span className="relative">
                  {typing}
                  {phase === "playing" && (
                    <Cursor at={typing.length} blink={false} />
                  )}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Once lines scroll off the top, fade the edge so none reads as cut in half. */
function fadeTop(el: HTMLElement) {
  el.dataset.clipped = String(el.scrollTop > 0);
}

/** Block cursor, placed by character (the face is monospaced). */
function Cursor({
  at,
  char,
  blink,
  hollow = false,
}: {
  at: number;
  char?: string;
  blink: boolean;
  hollow?: boolean;
}) {
  return (
    <span
      aria-hidden
      style={{ left: `${at}ch` }}
      className={cn(
        "pointer-events-none absolute top-0 h-full w-[1ch]",
        hollow ? "border border-accent" : "bg-accent text-bg",
        blink && "animate-[caret-blink_1.06s_steps(1,end)_infinite]",
      )}
    >
      {!hollow && char}
    </span>
  );
}
