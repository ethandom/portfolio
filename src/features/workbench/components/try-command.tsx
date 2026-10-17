"use client";

/** The window event a TryCommand key sends; WorkbenchApp runs it in the terminal. */
export const RUN_COMMAND = "workbench:relayctl";

/**
 * A relayctl line as a key: pressing it types the line into the bench
 * monitor's terminal and runs it (the board plugs in first if it isn't).
 * For panels, which the route renders and which can't reach the terminal.
 */
export function TryCommand({ command }: { command: string }) {
  return (
    <button
      type="button"
      aria-label={`Run ${command}`}
      onClick={() =>
        window.dispatchEvent(new CustomEvent(RUN_COMMAND, { detail: command }))
      }
      className="inline-flex h-7 items-center gap-1.5 border border-strong px-2 font-mono text-label text-ink transition-colors duration-(--dur-fast) ease-out hover:bg-sunken"
    >
      <span aria-hidden className="text-accent-text">
        $
      </span>
      {command}
    </button>
  );
}
