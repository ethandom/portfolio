import type { CSSProperties } from "react";

/** Pause with the cursor at the prompt, then one keystroke per step (ms). */
const START = 520;
const STEP = 85;
/** After the last keystroke the cursor blinks this many times, then goes. */
const BLINKS = 3;
const BLINK = 1060;

const at = (ms: number) => `calc(${ms}ms * var(--motion-scale))`;

/** A block cursor parked after a character; zero width, so nothing shifts. */
function Cursor({ style }: { style: CSSProperties }) {
  return (
    <span aria-hidden className="relative inline-block w-0">
      <span
        style={style}
        className="invisible absolute -bottom-[0.14em] left-[0.04em] h-[0.98em] w-[0.52em] bg-accent"
      />
    </span>
  );
}

/**
 * The name typed on load, behind an orange block cursor, like a prompt.
 * Pure CSS so it starts on first paint: the text is in the HTML the whole
 * time (screen readers and crawlers read it), only its visibility is
 * animated. Under reduced motion --motion-scale is 0, so it is simply there.
 */
export function TypedName({ text }: { text: string }) {
  const chars = [...text];
  const last = chars.length - 1;

  function key(char: string, i: number) {
    const typed = START + i * STEP;
    const cursor: CSSProperties =
      i === last
        ? {
            animation: `cursor-blink ${at(BLINK)} step-end ${BLINKS}`,
            animationDelay: at(typed),
          }
        : {
            animation: `cursor-hold ${at(STEP)} linear`,
            animationDelay: at(typed),
          };
    return (
      <span key={i}>
        <span
          style={{
            animation: "type-in 1ms linear backwards",
            animationDelay: at(typed),
          }}
        >
          {char}
        </span>
        <Cursor style={cursor} />
      </span>
    );
  }

  // Words never break inside (not at "Austin-|Cruse"); lines only break at spaces.
  const words: { start: number; chars: string[] }[] = [];
  chars.forEach((char, i) => {
    if (char === " ") return;
    if (i === 0 || chars[i - 1] === " ") words.push({ start: i, chars: [] });
    words[words.length - 1].chars.push(char);
  });

  return (
    <span>
      <Cursor style={{ animation: `cursor-hold ${at(START)} linear` }} />
      {words.map((word, w) => (
        <span key={word.start}>
          {w > 0 && key(" ", word.start - 1)}
          <span className="whitespace-nowrap">
            {word.chars.map((char, j) => key(char, word.start + j))}
          </span>
        </span>
      ))}
    </span>
  );
}
