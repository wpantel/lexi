"use client";

import { speak, useCanSpeak } from "@/lib/speech";
import { SpeakerIcon } from "./Icons";

export function SpeakButton({
  text,
  lang,
  variant = "",
  label,
}: {
  text: string;
  lang: string;
  variant?: string;
  label?: string;
}) {
  const canSpeak = useCanSpeak(lang);
  if (!canSpeak) return null;
  return (
    <button
      type="button"
      className={`icon-btn ${variant}`}
      aria-label={label ?? `Listen to ${text}`}
      onClick={(e) => {
        e.stopPropagation();
        speak(text, lang);
      }}
    >
      <SpeakerIcon size={variant.includes("big") ? 26 : 20} />
    </button>
  );
}
