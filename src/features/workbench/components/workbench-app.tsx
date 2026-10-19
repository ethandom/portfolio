"use client";

import {
  type MouseEvent,
  type PointerEvent,
  Suspense,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { Canvas } from "@react-three/fiber";
import { ACESFilmicToneMapping } from "three";
import { Kbd } from "@/components/manual";
import { useReducedMotion } from "@/components/motion";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import {
  HIT_LABELS,
  type HitId,
  STATION_IDS,
  STATION_LABELS,
  type StationId,
} from "../lib/hits";
import {
  HIT_PANELS,
  PANEL_KEEPS_FOCUS,
  PANEL_SIDE,
  type PanelId,
  type Panels,
  STATION_PANELS,
} from "../lib/panels";
import { DUSK } from "../lib/palette";
import { Terminal } from "../lib/terminal";
import { Loading } from "./loading";
import { type Layout, Scene, type SceneApi } from "./scene";
import { StationPanel } from "./station-panel";
import { RUN_COMMAND } from "./try-command";
import { TerminalInput, type TerminalInputHandle } from "./terminal-input";
import { ZoneOutline } from "./zone-outline";

/** Clicking these at the workbench, once the board has booted, puts the keyboard on the terminal. */
const TERMINAL_HITS: ReadonlySet<HitId> = new Set(["monitor", "relay"]);

/**
 * The Workbench scene with its DOM layer: the zone outline, the hover label
 * that follows the pointer, the Back key, a keyboard route to every station
 * and object (one key each, visible while it has focus), and the panel: a
 * 2D overlay that a station opens on arrival or an object opens on click.
 * At the workbench, once the relay board has booted, the monitor is a
 * relayctl terminal: a hidden input takes the keys.
 */
export function WorkbenchApp({ panels }: { panels: Panels }) {
  const reduced = useReducedMotion();
  const [station, setStation] = useState<StationId | null>(null);
  const [pointedZone, setPointedZone] = useState<StationId | null>(null);
  const [keyedZone, setKeyedZone] = useState<StationId | null>(null);
  const [pointed, setPointed] = useState<HitId | null>(null);
  const [keyed, setKeyed] = useState<HitId | null>(null);
  const [panel, setPanel] = useState<PanelId | null>(null);
  // Whether the visitor opened or closed a panel since the last station change.
  const chose = useRef(false);
  // Which objects sit at each station, from the model once it loads.
  const [layout, setLayout] = useState<Layout | null>(null);
  const api = useRef<SceneApi>(null);
  // The monitor's session: plain state the scene paints and the input feeds.
  const [terminal] = useState(() => new Terminal());
  const online = useSyncExternalStore(
    terminal.subscribe,
    () => terminal.online,
    () => false,
  );
  const term = useRef<TerminalInputHandle>(null);
  // A command key pressed before the board was online: run once it is.
  const queued = useRef<string | null>(null);
  const label = useRef<HTMLDivElement>(null);
  const outline = useRef<HTMLDivElement>(null);
  const keys = useRef<HTMLUListElement>(null);
  // A station change from the keyboard moves focus to the new first key.
  const refocus = useRef(false);

  const zone = station ? null : (pointedZone ?? keyedZone);
  const typing = station === "workbench" && online;

  function go(next: StationId | null, byKeyboard = false) {
    refocus.current = byKeyboard;
    chose.current = false;
    setPointedZone(null);
    setKeyedZone(null);
    setPointed(null);
    setKeyed(null);
    setPanel(null);
    setStation(next);
  }

  /** Esc or the Back key: an open panel closes first. */
  function back(byKeyboard = false) {
    if (panel) close();
    else go(null, byKeyboard);
  }

  /**
   * A click on nothing clickable closes an open panel but never leaves the
   * station: only Esc and the Back key do that (Ethan 2026-10-17).
   */
  function dismiss() {
    if (panel) close();
  }

  function open(id: PanelId | undefined) {
    if (!id || !panels[id]) return;
    chose.current = true;
    setPanel(id);
  }

  function close() {
    chose.current = true;
    setPanel(null);
  }

  /**
   * The station's own panel, once the camera arrives; not if the visitor
   * already opened or closed one on the way in (it would undo their choice).
   */
  function arrive(id: StationId) {
    if (!chose.current) open(STATION_PANELS[id]);
  }

  useEffect(() => {
    if (!refocus.current) return;
    refocus.current = false;
    keys.current?.querySelector("button")?.focus();
  }, [station]);

  // The board finished booting: the keyboard goes to the terminal, unless
  // focus is somewhere else on purpose (a panel, the Back key).
  useEffect(() => {
    if (!typing) return;
    const at = document.activeElement;
    if (!at || at === document.body || keys.current?.contains(at)) {
      term.current?.focus();
    }
  }, [typing]);

  /** Types a line into the terminal, runs it, and leaves the cursor there. */
  function run(command: string) {
    terminal.sync(command, command.length);
    terminal.submit();
    term.current?.focus();
  }

  // A panel's command key (TryCommand): run it, or plug the board in and
  // run it once the terminal is up.
  const onCommand = useEffectEvent((command: string) => {
    if (terminal.online) return run(command);
    queued.current = command;
    api.current?.act("relay");
  });
  useEffect(() => {
    const on = (e: Event) => onCommand((e as CustomEvent<string>).detail);
    window.addEventListener(RUN_COMMAND, on);
    return () => window.removeEventListener(RUN_COMMAND, on);
  }, []);
  const flush = useEffectEvent(() => {
    const command = queued.current;
    if (!command || !terminal.online) return;
    queued.current = null;
    run(command);
  });
  useEffect(() => terminal.subscribe(() => flush()), [terminal]);

  const onEscape = useEffectEvent(() => back(true));
  useEffect(() => {
    if (!station) return;
    const onKey = (e: KeyboardEvent) => {
      // Escape while an IME is composing cancels the composition only.
      if (e.key === "Escape" && !e.isComposing) onEscape();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [station]);

  // The label follows the pointer without re-rendering; it flips to the
  // left near the right edge.
  function track(e: PointerEvent<HTMLDivElement>) {
    const el = label.current;
    if (!el) return;
    const box = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - box.left;
    const y = e.clientY - box.top;
    const dx = x > box.width - 240 ? "calc(-100% - 14px)" : "14px";
    el.style.transform = `translate(${x}px, ${y}px) translate(${dx}, 14px)`;
  }

  // Keyboard-made clicks have no pointer position (detail 0).
  const byKeyboard = (e: MouseEvent) => e.detail === 0;

  return (
    <div
      data-theme="dark"
      onPointerMove={track}
      onPointerLeave={() => {
        setPointed(null);
        setPointedZone(null);
      }}
      style={{ background: DUSK }}
      className={cn(
        "relative h-dvh w-full overflow-hidden text-ink",
        (pointed || zone) && "cursor-pointer",
      )}
    >
      <h1 className="sr-only">Workbench</h1>

      <Canvas
        dpr={[1, 1.5]}
        // Draws only when asked (the scene's Pacer): every frame while
        // something moves, a low rate for the screens and the city's live
        // touches, nothing while all holds still.
        frameloop="demand"
        camera={{ near: 0.05, far: 5000 }}
        // Logarithmic depth: the bench is centimeters away and the skyline a
        // kilometer or more, which a plain 24-bit depth buffer can't separate
        // (the far towers z-fought). Opaque: the scene paints its own
        // background, so the page needn't blend the canvas. A stencil
        // buffer for the outlines on objects that open a panel (lib/outlines.ts).
        gl={{
          toneMapping: ACESFilmicToneMapping,
          logarithmicDepthBuffer: true,
          alpha: false,
          stencil: true,
        }}
        onPointerMissed={dismiss}
      >
        <Suspense fallback={null}>
          <Scene
            api={api}
            terminal={terminal}
            station={station}
            zone={zone}
            highlight={pointed ?? keyed}
            reduced={reduced}
            outline={outline}
            onHoverZone={setPointedZone}
            onHoverHit={setPointed}
            onGo={(id) => (id ? go(id) : dismiss())}
            onReady={setLayout}
            onAct={(id) => {
              open(HIT_PANELS[id]);
              if (TERMINAL_HITS.has(id) && terminal.online) {
                term.current?.focus();
              }
            }}
            onArrive={arrive}
          />
        </Suspense>
      </Canvas>

      {!layout && <Loading />}

      <ZoneOutline ref={outline} label={zone && STATION_LABELS[zone]} />

      <div
        ref={label}
        aria-hidden
        className={cn(
          "pointer-events-none absolute top-0 left-0 border border-strong bg-bg px-2 py-1 font-mono text-label whitespace-nowrap text-ink uppercase",
          !pointed && "hidden",
        )}
      >
        {pointed && HIT_LABELS[pointed]}
      </div>

      <nav
        aria-label={station ? `${STATION_LABELS[station]} objects` : "Stations"}
        className="absolute top-4 left-4"
      >
        <ul ref={keys}>
          {station
            ? layout?.[station]?.map((id) => (
                <li key={id} className="sr-only focus-within:not-sr-only">
                  <Button
                    variant="outline"
                    size="sm"
                    onFocus={() => setKeyed(id)}
                    onBlur={() => setKeyed(null)}
                    onClick={() => api.current?.act(id)}
                    className="bg-bg"
                  >
                    {HIT_LABELS[id]}
                  </Button>
                </li>
              ))
            : STATION_IDS.filter((id) => layout?.[id]).map((id) => (
                <li key={id} className="sr-only focus-within:not-sr-only">
                  <Button
                    variant="outline"
                    size="sm"
                    onFocus={() => setKeyedZone(id)}
                    onBlur={() => setKeyedZone(null)}
                    onClick={(e) => go(id, byKeyboard(e))}
                    className="bg-bg"
                  >
                    Go to {STATION_LABELS[id]}
                  </Button>
                </li>
              ))}
        </ul>
      </nav>

      <TerminalInput ref={term} terminal={terminal} active={typing} />

      {station && (
        // Bottom right: the Next dev badge sits bottom left.
        <Button
          variant="outline"
          size="sm"
          onClick={(e) => go(null, byKeyboard(e))}
          className="absolute right-4 bottom-4 bg-bg"
        >
          Back
          {/* With a panel open, Esc closes the panel (its own key says so). */}
          {!panel && <Kbd>Esc</Kbd>}
        </Button>
      )}

      <StationPanel
        content={panel ? (panels[panel] ?? null) : null}
        onClose={close}
        side={(panel && PANEL_SIDE[panel]) ?? "right"}
        takeFocus={!panel || !PANEL_KEEPS_FOCUS.has(panel)}
      />

      <p aria-live="polite" className="sr-only">
        {station ? STATION_LABELS[station] : "Overview"}
      </p>
    </div>
  );
}
