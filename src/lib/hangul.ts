// A Hangul syllable block is built from two or three letters (jamo): an opening
// consonant, a vowel, and sometimes a closing consonant. Unicode lays the
// 11,172 blocks out in a regular grid, so taking one apart is arithmetic.

const INITIALS = [..."ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ"];
const MEDIALS = [..."ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ"];
const FINALS = ["", ..."ㄱㄲㄳㄴㄵㄶㄷㄹㄺㄻㄼㄽㄾㄿㅀㅁㅂㅄㅅㅆㅇㅈㅊㅋㅌㅍㅎ"];

const FIRST = 0xac00;
const LAST = 0xd7a3;

export type Jamo = { char: string; kind: "consonant" | "vowel" };

/** The letters of one syllable block, in writing order. Empty for anything that is not a block. */
export function jamoOf(syllable: string): Jamo[] {
  const code = syllable.codePointAt(0) ?? 0;
  if (code < FIRST || code > LAST) return [];
  const offset = code - FIRST;
  const out: Jamo[] = [
    { char: INITIALS[Math.floor(offset / 588)], kind: "consonant" },
    { char: MEDIALS[Math.floor((offset % 588) / 28)], kind: "vowel" },
  ];
  const final = FINALS[offset % 28];
  if (final) out.push({ char: final, kind: "consonant" });
  return out;
}
