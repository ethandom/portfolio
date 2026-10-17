"use client";

import {
  type KeyboardEvent,
  type Ref,
  useEffect,
  useEffectEvent,
  useId,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { MAX_INPUT, type Terminal } from "../lib/terminal";

export type TerminalInputHandle = { focus: () => void };

type Keys = Pick<
  KeyboardEvent | globalThis.KeyboardEvent,
  "key" | "ctrlKey" | "metaKey" | "altKey" | "shiftKey"
>;

/**
 * The keys the terminal handles itself. Returns true when it did, and the
 * browser's default should stop. Escape is never one of them: the app's
 * window listener uses it to close a panel or leave the station. Meta and
 * Alt combinations stay native (paste, word and line edits) and come back
 * through the field's input and select events.
 */
function press(terminal: Terminal, e: Keys): boolean {
  if (e.key === "Escape" || e.metaKey || e.altKey) return false;
  if (e.ctrlKey) {
    const run = {
      c: () => terminal.interrupt(),
      l: () => terminal.clearScreen(),
      u: () => terminal.killLine(),
      a: () => terminal.home(),
      e: () => terminal.end(),
    }[e.key.toLowerCase()];
    run?.();
    return Boolean(run);
  }
  switch (e.key) {
    case "Enter":
      terminal.submit();
      return true;
    case "Backspace":
      terminal.backspace();
      return true;
    case "Delete":
      terminal.deleteForward();
      return true;
    case "ArrowLeft":
      terminal.move(-1);
      return true;
    case "ArrowRight":
      terminal.move(1);
      return true;
    case "Home":
      terminal.home();
      return true;
    case "End":
      terminal.end();
      return true;
    case "ArrowUp":
      terminal.recall(-1);
      return true;
    case "ArrowDown":
      terminal.recall(1);
      return true;
    case "Tab":
      // On an empty line Tab moves focus on, so the terminal never traps it.
      return !e.shiftKey && terminal.tab();
    default:
      return false;
  }
}

/** Keys that, typed with nothing focused, go to the terminal too. */
const TYPE_TO_FOCUS = new Set([
  "Enter",
  "Backspace",
  "Delete",
  "ArrowUp",
  "ArrowDown",
]);

/**
 * The bench monitor's keyboard: a visually hidden input that feeds the
 * Terminal while it's `active` (at the workbench, board booted). The
 * monitor draws the line and the caret; this field mirrors the line so
 * native editing (IME composition, paste, Option and Cmd edits) starts from
 * it and syncs back. With nothing else focused, typing anywhere lands here.
 * New output is mirrored into a screen-reader log.
 */
export function TerminalInput({
  ref,
  terminal,
  active,
}: {
  ref?: Ref<TerminalInputHandle>;
  terminal: Terminal;
  active: boolean;
}) {
  const field = useRef<HTMLInputElement>(null);
  const composing = useRef(false);
  // True while the field itself is the source of a change (no write-back of the caret).
  const pulling = useRef(false);
  const [log, setLog] = useState<{ id: number; text: string }[]>([]);
  const hint = useId();

  useImperativeHandle(
    ref,
    () => ({ focus: () => field.current?.focus({ preventScroll: true }) }),
    [],
  );

  /** Terminal → field: the line, and the caret while the field has focus. */
  function write() {
    const el = field.current;
    if (!el || composing.current) return;
    const stale = el.value !== terminal.input;
    if (stale) el.value = terminal.input;
    if (pulling.current && !stale) return;
    const { caret } = terminal;
    if (
      document.activeElement === el &&
      (el.selectionStart !== caret || el.selectionEnd !== caret)
    ) {
      el.setSelectionRange(caret, caret);
    }
  }

  /** Field → terminal: whatever native editing left in it. */
  function pull() {
    const el = field.current;
    if (!el) return;
    const caret =
      el.selectionDirection === "backward"
        ? el.selectionStart
        : el.selectionEnd;
    pulling.current = true;
    terminal.sync(el.value, caret ?? el.value.length);
    pulling.current = false;
  }

  const mirror = useEffectEvent(write);
  useEffect(() => {
    if (!active) return;
    mirror();
    const stop = terminal.subscribe(() => mirror());
    return () => {
      stop();
      terminal.setFocused(false);
    };
  }, [active, terminal]);

  // Each new piece of output, for screen readers (the monitor is a canvas).
  useEffect(() => {
    let last = terminal.said?.id ?? 0;
    return terminal.subscribe(() => {
      const said = terminal.said;
      if (!said || said.id === last) return;
      last = said.id;
      setLog((prev) => [...prev, said].slice(-8));
    });
  }, [terminal]);

  // Typing with nothing focused (after a click in the scene) goes here.
  useEffect(() => {
    if (!active) return;
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.defaultPrevented || e.isComposing) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const at = document.activeElement;
      if (at && at !== document.body) return;
      const printable = e.key.length === 1;
      if (!printable && !TYPE_TO_FOCUS.has(e.key)) return;
      const el = field.current;
      if (!el) return;
      e.preventDefault();
      el.focus({ preventScroll: true });
      if (printable) terminal.type(e.key);
      else press(terminal, e);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, terminal]);

  return (
    <>
      {active && (
        <div className="sr-only">
          <input
            ref={field}
            aria-label="relayctl command"
            aria-describedby={hint}
            defaultValue={terminal.input}
            maxLength={MAX_INPUT}
            spellCheck={false}
            autoCapitalize="off"
            autoComplete="off"
            autoCorrect="off"
            enterKeyHint="send"
            onKeyDown={(e) => {
              // An IME composing owns its keys, Enter included.
              if (e.nativeEvent.isComposing || e.keyCode === 229) return;
              if (press(terminal, e)) e.preventDefault();
            }}
            onChange={pull}
            onSelect={pull}
            onCompositionStart={() => {
              composing.current = true;
            }}
            onCompositionEnd={() => {
              composing.current = false;
              pull();
            }}
            onFocus={() => {
              terminal.setFocused(true);
              write();
            }}
            onBlur={() => terminal.setFocused(false)}
          />
          <span id={hint}>
            Types into the terminal on the bench monitor and drives the relay
            board. Enter runs a command; try help. Tab completes, up and down
            recall history, Escape leaves the workbench.
          </span>
        </div>
      )}
      <div role="log" aria-label="relayctl output" className="sr-only">
        {log.map((entry) => (
          <p key={entry.id}>{entry.text}</p>
        ))}
      </div>
    </>
  );
}
