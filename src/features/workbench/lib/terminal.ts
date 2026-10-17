import {
  complete,
  completions,
  type Line,
  run,
  type Tone,
} from "@/lib/relayctl";

/**
 * The bench monitor's relayctl session, as plain state: the scrollback, the
 * line being typed and its caret, history, and the board's mask. No DOM and
 * no three: the monitor paints it (screens.ts), a hidden input feeds it
 * keys (terminal-input.tsx), and the relay LEDs follow its mask
 * (relay-board.ts). Every change bumps `version` and calls the listeners.
 */

/** A command echoed after the prompt, or a line of output (`hang` as in relayctl's help). */
export type Row = {
  kind: "cmd" | "out";
  text: string;
  tone: Tone;
  hang?: number;
};

export const PROMPT = "$ ";
/** The longest command line: the prompt, this and the caret fit one monitor row. */
export const MAX_INPUT = 40;
/** Scrollback rows kept; older ones drop off the top. */
export const MAX_ROWS = 200;
const MAX_HISTORY = 100;
/** Shown dim after the caret until the first command of a session. */
export const HINT = "type help, or set 3 on";

/** Control characters (newlines, tabs, escapes) never reach the line. */
const CONTROL = /\p{Cc}/gu;

const clamp = (n: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, n));

const echo = (text: string): Row => ({ kind: "cmd", text, tone: "out" });
const output = (line: Line): Row => ({ kind: "out", ...line });

type Listener = () => void;

export class Terminal {
  #online = false;
  #rows: readonly Row[] = [];
  #input = "";
  #caret = 0;
  #mask = 0;
  #focused = false;
  #fresh = true;
  #version = 0;
  #said: { id: number; text: string } | null = null;
  #history: string[] = [];
  /** Where Up/Down is: an index into history, or its length for the line being typed. */
  #recall = 0;
  /** The line being typed, kept while Up/Down walks the history. */
  #draft = "";
  #listeners = new Set<Listener>();

  /** True while the board is plugged in and booted: a shell is attached. */
  get online() {
    return this.#online;
  }
  get rows() {
    return this.#rows;
  }
  get input() {
    return this.#input;
  }
  get caret() {
    return this.#caret;
  }
  /** The relay channels, CH1 in bit 0. */
  get mask() {
    return this.#mask;
  }
  /** Whether the input that feeds it has focus (the monitor's caret is solid). */
  get focused() {
    return this.#focused;
  }
  /** True until the session's first command: the prompt shows HINT. */
  get fresh() {
    return this.#fresh;
  }
  get version() {
    return this.#version;
  }
  /** The newest output as one string, for a screen reader; `id` grows with each. */
  get said() {
    return this.#said;
  }

  /** Stable, so React's useSyncExternalStore can take it as is. */
  subscribe = (listener: Listener) => {
    this.#listeners.add(listener);
    return () => {
      this.#listeners.delete(listener);
    };
  };

  #changed() {
    this.#version++;
    for (const listener of this.#listeners) listener();
  }

  #say(text: string) {
    if (text) this.#said = { id: (this.#said?.id ?? 0) + 1, text };
  }

  #print(rows: Row[]) {
    this.#rows = [...this.#rows, ...rows].slice(-MAX_ROWS);
    this.#fresh = false;
  }

  #edit(input: string, caret: number) {
    if (input === this.#input && caret === this.#caret) return;
    this.#input = input;
    this.#caret = caret;
    this.#changed();
  }

  /** The board came up: a new session with `banner` (the boot log) on screen and every channel off. */
  start(banner: readonly string[] = []) {
    this.#online = true;
    this.#rows = banner.map((text) => output({ text, tone: "out" }));
    this.#input = "";
    this.#caret = 0;
    this.#mask = 0;
    this.#fresh = true;
    this.#recall = this.#history.length;
    this.#draft = "";
    this.#say("relayctl ready on /dev/usbrelay0. Type help for commands.");
    this.#changed();
  }

  /** Unplugged: no shell, a blank screen, every channel off. History stays, as a shell's does. */
  reset() {
    if (!this.#online && !this.#rows.length && !this.#input && !this.#mask)
      return;
    this.#online = false;
    this.#rows = [];
    this.#input = "";
    this.#caret = 0;
    this.#mask = 0;
    this.#fresh = true;
    this.#recall = this.#history.length;
    this.#draft = "";
    this.#changed();
  }

  setFocused(focused: boolean) {
    if (focused === this.#focused) return;
    this.#focused = focused;
    this.#changed();
  }

  /** Inserts typed or pasted text at the caret, up to MAX_INPUT. */
  type(text: string) {
    if (!this.#online) return;
    const room = MAX_INPUT - this.#input.length;
    const add = text.replace(CONTROL, "").slice(0, Math.max(0, room));
    if (!add) return;
    const at = this.#caret;
    this.#edit(
      this.#input.slice(0, at) + add + this.#input.slice(at),
      at + add.length,
    );
  }

  /** Takes the native field's value and caret (IME, paste, word edits). */
  sync(value: string, caret: number) {
    if (!this.#online) return;
    const input = value.replace(CONTROL, "").slice(0, MAX_INPUT);
    this.#edit(input, clamp(caret, 0, input.length));
  }

  backspace() {
    const at = this.#caret;
    if (!this.#online || at === 0) return;
    this.#edit(this.#input.slice(0, at - 1) + this.#input.slice(at), at - 1);
  }

  /** Delete: the character under the caret. */
  deleteForward() {
    const at = this.#caret;
    if (!this.#online || at >= this.#input.length) return;
    this.#edit(this.#input.slice(0, at) + this.#input.slice(at + 1), at);
  }

  /** Moves the caret by `by` characters, within the line. */
  move(by: number) {
    if (!this.#online) return;
    this.#edit(this.#input, clamp(this.#caret + by, 0, this.#input.length));
  }

  home() {
    if (this.#online) this.#edit(this.#input, 0);
  }

  end() {
    if (this.#online) this.#edit(this.#input, this.#input.length);
  }

  /** Ctrl+U: deletes from the start of the line to the caret. */
  killLine() {
    if (this.#online) this.#edit(this.#input.slice(this.#caret), 0);
  }

  /** Up (-1) or Down (+1) through history; past the newest is the line being typed. */
  recall(step: -1 | 1) {
    if (!this.#online || !this.#history.length) return;
    const last = this.#history.length;
    const next = clamp(this.#recall + step, 0, last);
    if (next === this.#recall) return;
    if (this.#recall === last) this.#draft = this.#input;
    this.#recall = next;
    const line = next === last ? this.#draft : this.#history[next];
    this.#edit(line, line.length);
  }

  /**
   * Tab: completes the command word when one name fits, or lists the names
   * when several do (as bash's second Tab does). Returns false on an empty
   * line, so Tab can move focus on there and the terminal never traps it.
   */
  tab(): boolean {
    if (!this.#online || !this.#input.trim()) return false;
    // Completion reads the whole line, so only with the caret at its end.
    if (this.#caret !== this.#input.length) return true;
    const done = complete(this.#input).slice(0, MAX_INPUT);
    if (done !== this.#input) {
      this.#edit(done, done.length);
      return true;
    }
    const names = completions(this.#input);
    if (names.length > 1) {
      const list = names.join("  ");
      this.#print([echo(this.#input), output({ text: list, tone: "dim" })]);
      this.#say(list);
      this.#changed();
    }
    return true;
  }

  /** Enter: echoes the line after the prompt, runs it against the mask, prints the output. */
  submit(): Line[] {
    if (!this.#online) return [];
    const command = this.#input.trim();
    const history = this.#history;
    if (command && history.at(-1) !== command) {
      history.push(command);
      if (history.length > MAX_HISTORY) history.shift();
    }
    this.#recall = history.length;
    this.#draft = "";
    const result = run(command, this.#mask);
    this.#mask = result.mask;
    this.#input = "";
    this.#caret = 0;
    if (result.clear) {
      this.#rows = [];
      this.#fresh = false;
      this.#say("Screen cleared");
    } else {
      this.#print([echo(command), ...result.lines.map(output)]);
      this.#say(result.lines.map((l) => l.text).join("\n"));
    }
    this.#changed();
    return result.clear ? [] : result.lines;
  }

  /** Ctrl+C: drops the line, echoed with ^C. */
  interrupt() {
    if (!this.#online) return;
    this.#print([echo(`${this.#input}^C`)]);
    this.#input = "";
    this.#caret = 0;
    this.#recall = this.#history.length;
    this.#draft = "";
    this.#changed();
  }

  /** Ctrl+L: clears the screen and keeps the line being typed. */
  clearScreen() {
    if (!this.#online) return;
    this.#rows = [];
    this.#fresh = false;
    this.#changed();
  }
}

/* ----------------------------------------------------------- the screen -- */

/** What colors a span: a relayctl tone, or the prompt's `$`. */
export type Ink = Tone | "prompt";
export type Span = { text: string; ink: Ink };

export type Screen = {
  /** Every row of the session, oldest first; the prompt line is last. */
  lines: Span[][];
  /** The caret on the prompt line, and the character under it. */
  caret: { line: number; column: number; char: string };
};

/**
 * Word-wraps to `columns`. Continuation rows are indented `indent` columns;
 * a word longer than a row breaks.
 */
export function wrap(text: string, columns: number, indent = 2): string[] {
  const lead = " ".repeat(clamp(indent, 0, columns - 1));
  const rows: string[] = [];
  let row = "";
  let fresh = true;
  for (let word of text.split(" ")) {
    if (!fresh && row.length + 1 + word.length > columns) {
      rows.push(row);
      row = lead;
      fresh = true;
    }
    if (!fresh) {
      row += ` ${word}`;
      continue;
    }
    while (row.length + word.length > columns) {
      const take = columns - row.length;
      rows.push(row + word.slice(0, take));
      word = word.slice(take);
      row = lead;
    }
    row += word;
    fresh = false;
  }
  rows.push(row);
  return rows;
}

/**
 * The session laid out `columns` wide: the scrollback wrapped, then the
 * prompt with the line being typed (or the hint, before the first command).
 * The line never wraps: MAX_INPUT keeps it on one row.
 */
export function layout(terminal: Terminal, columns: number): Screen {
  const lines: Span[][] = [];
  for (const row of terminal.rows) {
    if (row.kind === "cmd") {
      wrap(`${PROMPT}${row.text}`, columns, 0).forEach((text, i) =>
        lines.push(
          i === 0
            ? [
                { text: PROMPT, ink: "prompt" },
                { text: text.slice(PROMPT.length), ink: "out" },
              ]
            : [{ text, ink: "out" }],
        ),
      );
    } else {
      for (const text of wrap(row.text, columns, row.hang ?? 2))
        lines.push([{ text, ink: row.tone }]);
    }
  }
  const { input, caret } = terminal;
  const prompt: Span[] = [{ text: PROMPT, ink: "prompt" }];
  if (input) prompt.push({ text: input, ink: "out" });
  else if (terminal.fresh) prompt.push({ text: `  ${HINT}`, ink: "dim" });
  lines.push(prompt);
  return {
    lines,
    caret: {
      line: lines.length - 1,
      column: PROMPT.length + caret,
      char: input[caret] ?? " ",
    },
  };
}
