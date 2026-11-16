"use client";

import { useSyncExternalStore } from "react";

function synth(): SpeechSynthesis | null {
  return typeof window !== "undefined" && "speechSynthesis" in window ? window.speechSynthesis : null;
}

function voiceFor(lang: string): SpeechSynthesisVoice | null {
  const s = synth();
  if (!s) return null;
  const prefix = lang.slice(0, 2).toLowerCase();
  const voices = s.getVoices().filter((v) => v.lang.toLowerCase().startsWith(prefix));
  return voices.find((v) => v.localService) ?? voices[0] ?? null;
}

export function speak(text: string, lang: string) {
  const s = synth();
  if (!s) return;
  s.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = lang;
  const voice = voiceFor(lang);
  if (voice) u.voice = voice;
  u.rate = 0.85;
  s.speak(u);
}

function subscribe(cb: () => void) {
  const s = synth();
  s?.addEventListener("voiceschanged", cb);
  return () => s?.removeEventListener("voiceschanged", cb);
}

/** Whether this browser has a voice for the language. Voices load late, so this can flip to true. */
export function useCanSpeak(lang: string): boolean {
  return useSyncExternalStore(subscribe, () => voiceFor(lang) !== null, () => false);
}
