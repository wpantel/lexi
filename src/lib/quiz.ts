import type { Language, Word } from "./language";

export function shuffle<T>(items: readonly T[]): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Four answer options for a word: itself plus three plausible wrong answers.
 * Wrong answers share the word's part of speech and come from nearby in the
 * course, so the choice takes real recall rather than elimination.
 */
export function optionsFor(word: Word, lang: Language): Word[] {
  const distinct = (w: Word) => w.term !== word.term && w.meaning !== word.meaning;
  const samePos = lang.words.filter((w) => distinct(w) && w.pos === word.pos);
  const pool = samePos.length >= 3 ? samePos : lang.words.filter(distinct);
  const near = [...pool].sort((a, b) => Math.abs(a.rank - word.rank) - Math.abs(b.rank - word.rank)).slice(0, 14);
  return shuffle([word, ...shuffle(near).slice(0, 3)]);
}
