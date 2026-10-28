"use client";

import { useSyncExternalStore } from "react";
import { SpeakerHighIcon, SpeakerSlashIcon } from "@phosphor-icons/react";
import { Led } from "@/components/manual";
import { Button } from "@/components/ui/button";
import type { Sound } from "../lib/sound";

const TITLES = {
  playing: "Mute",
  waiting: "Start sound",
  muted: "Unmute",
} as const;

/**
 * The sound key, top left: pressed (LED lit) while the music plays. Sound
 * is on by default, but the browser holds it until the first click or key;
 * pressing the key then starts it rather than muting what was never heard.
 * A mouse press hands focus back to the page, so typing at the bench keeps
 * going to the terminal.
 */
export function SoundKey({ sound }: { sound: Sound }) {
  const state = useSyncExternalStore(
    sound.subscribe,
    () => sound.state,
    () => "waiting" as const,
  );
  const Icon = state === "muted" ? SpeakerSlashIcon : SpeakerHighIcon;
  return (
    <Button
      variant="outline"
      size="sm"
      // SOUND_KEY: the first press here isn't taken as the page's go-ahead.
      data-sound-key=""
      aria-pressed={state === "playing"}
      title={TITLES[state]}
      onClick={(e) => {
        sound.toggle();
        if (e.detail > 0) e.currentTarget.blur();
      }}
      className="bg-bg"
    >
      <Icon weight="light" />
      Sound
      <Led state={state === "playing" ? "accent" : "off"} />
    </Button>
  );
}
