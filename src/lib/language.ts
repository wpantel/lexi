import koData from "@/data/ko.json";

export type Word = {
  /** The word in the language being learned. Also its stable id. */
  term: string;
  meaning: string;
  pos: string;
  /** Pronunciation guide in Latin letters. */
  reading: string;
  unitId: string;
  /** 0-based position in the whole course, most essential first. */
  rank: number;
};

export type Unit = {
  id: string;
  title: string;
  description: string;
  words: Word[];
};

export type Language = {
  code: string;
  name: string;
  nativeName: string;
  /** BCP 47 tag used for text-to-speech. */
  speechLang: string;
  units: Unit[];
  words: Word[];
  byTerm: Map<string, Word>;
};

type RawData = {
  units: { id: string; title: string; description: string; words: Omit<Word, "unitId" | "rank">[] }[];
};

function makeLanguage(meta: Pick<Language, "code" | "name" | "nativeName" | "speechLang">, data: RawData): Language {
  let rank = 0;
  const units: Unit[] = data.units.map((u) => ({
    ...u,
    words: u.words.map((w) => ({ ...w, unitId: u.id, rank: rank++ })),
  }));
  const words = units.flatMap((u) => u.words);
  return { ...meta, units, words, byTerm: new Map(words.map((w) => [w.term, w])) };
}

/**
 * To add a language: write data/<code>.source.txt, extend scripts/build-words.mjs
 * to build it, then register it here.
 */
export const languages: Record<string, Language> = {
  ko: makeLanguage({ code: "ko", name: "Korean", nativeName: "한국어", speechLang: "ko-KR" }, koData as RawData),
};

export const currentLanguage: Language = languages.ko;

export const POS_LABEL: Record<string, string> = {
  n: "noun",
  v: "verb",
  adj: "adjective",
  adv: "adverb",
  pron: "pronoun",
  num: "number",
  count: "counter",
  det: "determiner",
  conj: "connector",
  expr: "phrase",
};
