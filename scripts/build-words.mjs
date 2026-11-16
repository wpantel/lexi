// Builds src/data/<lang>.json from data/<lang>.source.txt.
// Dedupes words, trims the whole list to TARGET words (cutting the least
// essential tail of the longest units first) and adds a pronunciation guide.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const TARGET = 1000;
const MIN_PER_UNIT = 40;

/* ---------- Revised Romanization (pronunciation-oriented) ---------- */
const ONSET = ["g", "kk", "n", "d", "tt", "r", "m", "b", "pp", "s", "ss", "", "j", "jj", "ch", "k", "t", "p", "h"];
const VOWEL = ["a", "ae", "ya", "yae", "eo", "e", "yeo", "ye", "o", "wa", "wae", "oe", "yo", "u", "wo", "we", "wi", "yu", "eu", "ui", "i"];
// For each final consonant: [sound at end of syllable, what stays, what links to a following vowel]
const CODA = [
  ["", "", ""], ["k", "", "g"], ["k", "", "kk"], ["k", "k", "s"], ["n", "", "n"], ["n", "n", "j"],
  ["n", "", "n"], ["t", "", "d"], ["l", "", "r"], ["k", "l", "g"], ["m", "l", "m"], ["l", "l", "b"],
  ["l", "l", "s"], ["l", "l", "t"], ["p", "l", "p"], ["l", "", "r"], ["m", "", "m"], ["p", "", "b"],
  ["p", "p", "s"], ["t", "", "s"], ["t", "", "ss"], ["ng", "ng", ""], ["t", "", "j"], ["t", "", "ch"],
  ["k", "", "k"], ["t", "", "t"], ["p", "", "p"], ["t", "", ""],
];
const H_CODAS = new Set([6, 15, 27]); // ㄶ ㅀ ㅎ
const ASPIRATE = { 0: "k", 3: "t", 12: "ch" }; // ㅎ + ㄱ/ㄷ/ㅈ
const NASAL = { k: "ng", t: "n", p: "m" };

function decompose(ch) {
  const code = ch.charCodeAt(0) - 0xac00;
  if (code < 0 || code > 11171) return null;
  return { o: Math.floor(code / 588), v: Math.floor((code % 588) / 28), c: code % 28 };
}

export function romanize(text) {
  const syl = [...text].map((ch) => decompose(ch) ?? ch);
  let out = "";
  for (let i = 0; i < syl.length; i++) {
    const s = syl[i];
    if (typeof s === "string") { out += s; continue; }
    const prev = typeof syl[i - 1] === "object" ? syl[i - 1] : null;
    const next = typeof syl[i + 1] === "object" ? syl[i + 1] : null;

    // Onset, adjusted by the previous syllable's final consonant.
    let onset = ONSET[s.o];
    if (prev && prev.c) {
      const prevEnd = CODA[prev.c][0];
      if (s.o === 11) onset = ""; // handled by liaison on the previous syllable
      else if (H_CODAS.has(prev.c) && ASPIRATE[s.o]) onset = ASPIRATE[s.o];
      else if (s.o === 18 && ["k", "t", "p"].includes(prevEnd)) onset = ""; // 축하 → chuka
      else if (s.o === 5 && prevEnd === "l") onset = "l"; // ㄹㄹ → ll
      else if (s.o === 5 && prevEnd === "n") onset = "l"; // 연락 → yeollak
      else if (s.o === 5) onset = "n"; // 심리 → simni
      else if (s.o === 2 && prevEnd === "l") onset = "l"; // 설날 → seollal
    }

    // Coda, adjusted by the next syllable's onset.
    let coda = "";
    if (s.c) {
      const [end, stay, link] = CODA[s.c];
      coda = end;
      if (next) {
        if (next.o === 11) {
          // Liaison: the final consonant moves onto the following vowel.
          let moved = link;
          if (next.v === 20 && s.c === 25) moved = "ch"; // 같이 → gachi
          if (next.v === 20 && s.c === 7) moved = "j"; // 굳이 → guji
          coda = stay + moved;
        } else if (H_CODAS.has(s.c)) {
          coda = s.c === 6 ? "n" : s.c === 15 ? "l" : ASPIRATE[next.o] ? "" : next.o === 2 ? "n" : "";
        } else if (next.o === 18 && ["k", "t", "p"].includes(end)) {
          coda = end; // aspirated: 축하 → chuka
        } else if ((next.o === 2 || next.o === 6) && NASAL[end]) {
          coda = NASAL[end]; // 합니다 → hamnida
        } else if (next.o === 5 && NASAL[end]) {
          coda = NASAL[end];
        } else if (next.o === 5 && end === "n") {
          coda = "l";
        }
      }
    }
    out += onset + VOWEL[s.v] + coda;
  }
  return out;
}

/* ---------- Build ---------- */
function slug(title) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function build(lang) {
  const src = readFileSync(join(root, "data", `${lang}.source.txt`), "utf8");
  const units = [];
  const seen = new Map();
  const dupes = [];
  for (const raw of src.split("\n")) {
    const line = raw.trim();
    if (!line || (line.startsWith("#") && !line.startsWith("##"))) continue;
    if (line.startsWith("##")) {
      const [title, description = ""] = line.slice(2).split("|").map((s) => s.trim());
      units.push({ id: slug(title), title, description, words: [] });
      continue;
    }
    const parts = line.split("|").map((s) => s.trim());
    if (parts.length !== 3 || parts.some((p) => !p)) throw new Error(`Bad line: ${line}`);
    const [term, meaning, pos] = parts;
    if (seen.has(term)) { dupes.push(`${term} (${seen.get(term)} / ${units.at(-1).title})`); continue; }
    seen.set(term, units.at(-1).title);
    units.at(-1).words.push({ term, meaning, pos, reading: romanize(term) });
  }

  let total = units.reduce((n, u) => n + u.words.length, 0);
  const before = total;
  while (total > TARGET) {
    const longest = units.reduce((a, b) => (b.words.length > a.words.length ? b : a));
    if (longest.words.length <= MIN_PER_UNIT) break;
    longest.words.pop();
    total--;
  }

  const out = join(root, "src", "data", `${lang}.json`);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, JSON.stringify({ units }, null, 1));
  console.log(`${lang}: ${before} unique words in source → ${total} written`);
  if (dupes.length) console.log(`  skipped duplicates: ${dupes.join(", ")}`);
  for (const u of units) console.log(`  ${String(u.words.length).padStart(3)}  ${u.title}`);
}

build("ko");
