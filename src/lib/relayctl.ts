/**
 * A browser port of relayctl, the user-space CLI from
 * github.com/ethandom/SainSmart5VUSBRelayDriver (userspace/tools/relayctl.c).
 * Same commands, same response lines, same error codes. The one change is the
 * channel count: the repo's header pins it to 4, while the kernel driver
 * drives all 8 bit-bang pins, so the emulated board has 8.
 */

export const CHANNELS = 8;
export const DEVICE = "/dev/usbrelay0";
const MASK_ALL = (1 << CHANNELS) - 1;
const PROTO_VERSION = "1.1";
const TOOL_VERSION = "0.1";
const MAX_HEX = MASK_ALL.toString(16).toUpperCase().padStart(2, "0");

export type Tone = "out" | "ok" | "err" | "dim";
/** `hang`: wrapped continuation lines indent this many columns (help's description column). */
export type Line = { text: string; tone: Tone; hang?: number };
export type Result = { mask: number; lines: Line[]; clear?: boolean };

export const COMMANDS = [
  "set",
  "get",
  "getall",
  "toggle",
  "write-mask",
  "read-mask",
  "reset",
  "ping",
  "version",
  "help",
] as const;

const ok = (text: string): Line => ({ text, tone: "ok" });
const err = (text: string): Line => ({ text, tone: "err" });
const out = (text: string): Line => ({ text, tone: "out" });

export const hex = (mask: number) =>
  `0x${mask.toString(16).toUpperCase().padStart(2, "0")}`;

/** CH1 is bit 0, as in USBRELAY_CH_TO_BIT. */
export const bit = (ch: number) => 1 << (ch - 1);

/** relayctl's usage text, narrowed to fit a phone (37 columns). `relayctl` is optional here, as in its -i REPL. */
const HELP_COL = 18;
const HELP: Line[] = [
  out("Usage: [relayctl] <command>"),
  ...(
    [
      ["set <ch> <on|off>", "Set on or off"],
      ["get <ch>", "Read one channel"],
      ["getall", "Read all (mask)"],
      ["toggle <ch>", "Flip one channel"],
      ["write-mask 0xHH", `Write all 0x00-0x${MAX_HEX}`],
      ["read-mask", "Read device mask"],
      ["reset", "All channels off"],
      ["ping", "Check the device"],
      ["version", "Tool version"],
      ["clear", "Clear the screen"],
    ] as const
  ).map(([cmd, what]) => ({
    text: `${cmd.padEnd(HELP_COL)}${what}`,
    tone: "out" as const,
    hang: HELP_COL,
  })),
];

function parseChannel(arg: string): number | Line {
  const ch = /^[+-]?\d+$/.test(arg) ? Number(arg) : NaN;
  if (!Number.isInteger(ch) || ch < 1 || ch > CHANNELS)
    return err(`ERR BAD_CHANNEL Channel must be 1..${CHANNELS}`);
  return ch;
}

/** strtol(arg, &end, 0): decimal, 0x hex or leading-zero octal. */
function parseMask(arg: string): number | Line {
  const m = /^(?:0x([0-9a-f]+)|(0[0-7]*)|([1-9]\d*))$/i.exec(arg);
  const val = m
    ? parseInt(m[1] ?? m[2] ?? m[3], m[1] ? 16 : m[2] ? 8 : 10)
    : NaN;
  if (Number.isNaN(val) || val > 0xff)
    return err("ERR BAD_MASK Mask must be 0xHH");
  if (val & ~MASK_ALL)
    return err(`ERR BAD_MASK Mask must be in range 0x00-0x${MAX_HEX}`);
  return val;
}

/**
 * Runs one command line against the board's mask. Accepts "relayctl set 1 on"
 * and, as in relayctl's -i REPL, the bare "set 1 on".
 */
export function run(input: string, mask: number): Result {
  const argv = input.trim().split(/\s+/).filter(Boolean);
  if (argv.length === 0) return { mask, lines: [] };

  if (argv[0] === "clear") return { mask, lines: [], clear: true };
  if (argv[0] === "relayctl") argv.shift();
  else if (
    !COMMANDS.includes(argv[0].toLowerCase() as (typeof COMMANDS)[number])
  )
    return { mask, lines: [err(`sh: ${argv[0]}: command not found`)] };

  // Options come first: -v and -i are accepted, -d picks the device.
  let device = DEVICE;
  while (argv[0]?.startsWith("-")) {
    const flag = argv.shift()!;
    if (flag === "-v" || flag === "-i") continue;
    if (flag === "-d") {
      const path = argv.shift();
      if (!path)
        return {
          mask,
          lines: [err("ERR BAD_COMMAND -d requires a device path")],
        };
      device = path;
      continue;
    }
    return { mask, lines: [err(`ERR BAD_COMMAND Unknown option: ${flag}`)] };
  }

  const [name, ...args] = argv;
  if (!name) return { mask, lines: HELP };
  const cmd = name.toLowerCase();
  const fail = (line: Line): Result => ({ mask, lines: [line] });
  const arity = (n: number, usage: string) =>
    args.length < n
      ? err(`ERR BAD_COMMAND ${cmd} requires: ${usage}`)
      : args.length > n
        ? err("ERR BAD_COMMAND Unexpected extra arguments")
        : null;

  if (!(COMMANDS as readonly string[]).includes(cmd))
    return fail(err(`ERR BAD_COMMAND Unknown command: ${name}`));

  if (cmd === "help") return { mask, lines: HELP };
  if (cmd === "version")
    return fail(
      ok(`OK VERSION=${PROTO_VERSION} TOOL=relayctl/${TOOL_VERSION}`),
    );

  // Everything else opens the device first.
  if (device !== DEVICE)
    return fail(
      err(`ERR DEVICE_UNAVAILABLE Failed to open device ${device} (errno=2)`),
    );

  switch (cmd) {
    case "set": {
      const bad = arity(2, "set <ch> <on|off>");
      if (bad) return fail(bad);
      const ch = parseChannel(args[0]);
      if (typeof ch !== "number") return fail(ch);
      const state = args[1].toLowerCase();
      if (state !== "on" && state !== "off")
        return fail(err("ERR BAD_STATE State must be ON or OFF"));
      const next = state === "on" ? mask | bit(ch) : mask & ~bit(ch);
      return {
        mask: next,
        lines: [ok(`OK CH=${ch} STATE=${state.toUpperCase()}`)],
      };
    }
    case "get":
    case "toggle": {
      const bad = arity(1, `${cmd} <ch>`);
      if (bad) return fail(bad);
      const ch = parseChannel(args[0]);
      if (typeof ch !== "number") return fail(ch);
      const next = cmd === "toggle" ? mask ^ bit(ch) : mask;
      return {
        mask: next,
        lines: [ok(`OK CH=${ch} STATE=${next & bit(ch) ? "ON" : "OFF"}`)],
      };
    }
    case "write-mask": {
      const bad = arity(1, "write-mask 0xHH");
      if (bad) return fail(bad);
      const m = parseMask(args[0]);
      if (typeof m !== "number") return fail(m);
      return { mask: m, lines: [ok(`OK MASK=${hex(m)}`)] };
    }
    default: {
      const bad = arity(0, cmd);
      if (bad) return fail(bad);
      if (cmd === "reset") return { mask: 0, lines: [ok("OK MASK=0x00")] };
      if (cmd === "ping") return fail(ok("OK"));
      return fail(ok(`OK MASK=${hex(mask)}`)); // getall, read-mask
    }
  }
}

/** The command word being typed: everything before it, and the word. */
const WORD = /^(\s*(?:relayctl\s+)?)(\S*)$/;

/**
 * The names that could finish the command word being typed. On its own the
 * word can also be `relayctl` or the shell's `clear`; after `relayctl` only
 * its commands.
 */
export function completions(input: string): string[] {
  const m = WORD.exec(input);
  if (!m || !m[2]) return [];
  const word = m[2].toLowerCase();
  const names: readonly string[] = m[1].trim()
    ? COMMANDS
    : ["relayctl", ...COMMANDS, "clear"];
  return names.filter((c) => c.startsWith(word));
}

/** Tab completion: the one name that starts with what's typed. */
export function complete(input: string): string {
  const m = WORD.exec(input);
  const hits = completions(input);
  return m && hits.length === 1 ? `${m[1]}${hits[0]} ` : input;
}
