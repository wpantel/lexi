"use client";

import { useSyncExternalStore } from "react";
import { Card, DAY, Grade, dayKey, newCard, schedule, startOfDay, statusOf } from "./srs";
import type { Language, Word } from "./language";

export type Settings = {
  /** New words introduced per day. */
  dailyNew: number;
  showReading: boolean;
  autoSpeak: boolean;
};

export type DayLog = { learned: number; reviewed: number };

export type Progress = {
  cards: Record<string, Card>;
  history: Record<string, DayLog>;
};

export type State = {
  version: 1;
  settings: Settings;
  progress: Record<string, Progress>;
};

const KEY = "lexi:v1";
/** The app's storage key before it was renamed. Progress saved under it is carried over once. */
const OLD_KEY = "hangul-deck:v1";
const EMPTY_PROGRESS: Progress = { cards: {}, history: {} };
const DEFAULT_STATE: State = {
  version: 1,
  settings: { dailyNew: 10, showReading: true, autoSpeak: true },
  progress: {},
};

let state: State = DEFAULT_STATE;
let loaded = false;
const listeners = new Set<() => void>();

function load() {
  loaded = true;
  try {
    let raw = window.localStorage.getItem(KEY);
    if (!raw) {
      raw = window.localStorage.getItem(OLD_KEY);
      if (raw) {
        window.localStorage.setItem(KEY, raw);
        window.localStorage.removeItem(OLD_KEY);
      }
    }
    if (!raw) return;
    const parsed = JSON.parse(raw) as Partial<State>;
    state = {
      version: 1,
      settings: { ...DEFAULT_STATE.settings, ...parsed.settings },
      progress: parsed.progress ?? {},
    };
  } catch {
    // Unreadable or blocked storage: start fresh for this visit.
  }
}

function getSnapshot(): State {
  if (!loaded) load();
  return state;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key !== KEY) return;
    load();
    listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

function update(fn: (s: State) => State) {
  state = fn(getSnapshot());
  try {
    window.localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // Storage full or blocked; progress stays in memory for this visit.
  }
  listeners.forEach((l) => l());
}

export function useAppState(): State {
  return useSyncExternalStore(subscribe, getSnapshot, () => DEFAULT_STATE);
}

const noop = () => () => {};
/** False on the server and during hydration, true afterwards. */
export function useHydrated(): boolean {
  return useSyncExternalStore(noop, () => true, () => false);
}

export function progressFor(s: State, lang: string): Progress {
  return s.progress[lang] ?? EMPTY_PROGRESS;
}

function withProgress(s: State, lang: string, fn: (p: Progress) => Progress): State {
  return { ...s, progress: { ...s.progress, [lang]: fn(progressFor(s, lang)) } };
}

function bump(history: Progress["history"], now: number, field: keyof DayLog): Progress["history"] {
  const key = dayKey(now);
  const day = history[key] ?? { learned: 0, reviewed: 0 };
  return { ...history, [key]: { ...day, [field]: day[field] + 1 } };
}

/* ---------- Actions ---------- */

export function markLearned(lang: string, term: string) {
  update((s) =>
    withProgress(s, lang, (p) => {
      if (p.cards[term]) return p;
      const now = Date.now();
      return { cards: { ...p.cards, [term]: newCard(now) }, history: bump(p.history, now, "learned") };
    }),
  );
}

export function gradeCard(lang: string, term: string, grade: Grade) {
  update((s) =>
    withProgress(s, lang, (p) => {
      const card = p.cards[term];
      if (!card) return p;
      const now = Date.now();
      return { cards: { ...p.cards, [term]: schedule(card, grade, now) }, history: bump(p.history, now, "reviewed") };
    }),
  );
}

export function logPractice(lang: string) {
  update((s) => withProgress(s, lang, (p) => ({ ...p, history: bump(p.history, Date.now(), "reviewed") })));
}

export function setSettings(patch: Partial<Settings>) {
  update((s) => ({ ...s, settings: { ...s.settings, ...patch } }));
}

export function resetProgress(lang: string) {
  update((s) => withProgress(s, lang, () => EMPTY_PROGRESS));
}

/* ---------- Selectors ---------- */

export function dueTerms(p: Progress, now: number): string[] {
  return Object.entries(p.cards)
    .filter(([, c]) => c.due <= now)
    .sort((a, b) => a[1].due - b[1].due)
    .map(([term]) => term);
}

export function nextNewWords(lang: Language, p: Progress, count: number): Word[] {
  const out: Word[] = [];
  for (const w of lang.words) {
    if (out.length >= count) break;
    if (!p.cards[w.term]) out.push(w);
  }
  return out;
}

export function streak(p: Progress, now: number): number {
  const active = (ts: number) => {
    const d = p.history[dayKey(ts)];
    return !!d && d.learned + d.reviewed > 0;
  };
  // Noon avoids daylight-saving edges when stepping back a day at a time.
  let cursor = startOfDay(now) + DAY / 2;
  if (!active(cursor)) cursor -= DAY;
  let n = 0;
  while (active(cursor)) {
    n++;
    cursor -= DAY;
  }
  return n;
}

export function summary(lang: Language, p: Progress, settings: Settings, now: number) {
  let learned = 0;
  let mastered = 0;
  let nextDue = Infinity;
  for (const c of Object.values(p.cards)) {
    learned++;
    if (statusOf(c) === "mastered") mastered++;
    if (c.due > now && c.due < nextDue) nextDue = c.due;
  }
  const today = p.history[dayKey(now)] ?? { learned: 0, reviewed: 0 };
  const remaining = lang.words.length - learned;
  return {
    total: lang.words.length,
    learned,
    mastered,
    due: dueTerms(p, now),
    today,
    /** New words still to learn to hit today's goal. */
    newLeftToday: Math.max(0, Math.min(settings.dailyNew - today.learned, remaining)),
    remaining,
    nextDue: Number.isFinite(nextDue) ? nextDue : null,
    streak: streak(p, now),
  };
}

export function lastSevenDays(p: Progress, now: number) {
  const noon = startOfDay(now) + DAY / 2;
  return Array.from({ length: 7 }, (_, i) => {
    const ts = noon - (6 - i) * DAY;
    const d = p.history[dayKey(ts)] ?? { learned: 0, reviewed: 0 };
    return { ts, count: d.learned + d.reviewed, isToday: i === 6 };
  });
}
