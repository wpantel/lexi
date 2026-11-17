"use client";

import { speak, useCanSpeak } from "@/lib/speech";
import { SpeakerIcon } from "./Icons";

export function SpeakButton({
  text,
  lang,
  variant = "",
  label,
  showLabel = false,
}: {
  text: string;
  lang: string;
  variant?: string;
  label?: string;
  /** Spell out "Listen" next to the icon, where there is room for it. */
  showLabel?: boolean;
}) {
  const canSpeak = useCanSpeak(lang);
  if (!canSpeak) return null;
  return (
    <button
      type="button"
      className={`icon-btn ${variant} ${showLabel ? "labeled" : ""}`}
      aria-label={label ?? `Listen to ${text}`}
      onClick={(e) => {
        e.stopPropagation();
        speak(text, lang);
      }}
    >
      <SpeakerIcon size={variant.includes("big") ? 30 : 20} />
      {showLabel && <span aria-hidden="true">Listen</span>}
    </button>
  );
}
