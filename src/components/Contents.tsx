import Link from "next/link";
import type { Language } from "@/lib/language";
import { statusOf } from "@/lib/srs";
import type { Progress } from "@/lib/store";

type CellState = "new" | "learning" | "mastered" | "due";

const LEGEND: { state: CellState; label: string }[] = [
  { state: "due", label: "due now" },
  { state: "learning", label: "learning" },
  { state: "mastered", label: "mastered" },
  { state: "new", label: "to go" },
];

/**
 * The course as a workbook's contents page: a line per unit, and on each line
 * a square per word that fills in as the word is learned. Each line opens the
 * unit's word list.
 */
export function Contents({ lang, progress, now }: { lang: Language; progress: Progress; now: number }) {
  const counts: Record<CellState, number> = { new: 0, learning: 0, mastered: 0, due: 0 };
  const units = lang.units.map((u) => {
    let known = 0;
    const cells = u.words.map((w) => {
      const card = progress.cards[w.term];
      const state: CellState = !card ? "new" : card.due <= now ? "due" : statusOf(card) === "mastered" ? "mastered" : "learning";
      counts[state]++;
      if (card) known++;
      return { word: w, state };
    });
    return { unit: u, cells, known };
  });
  const perRow = Math.ceil(Math.max(...units.map((u) => u.cells.length)) / 2);

  return (
    <div className="contents">
      <ul className="legend">
        {LEGEND.map(({ state, label }) => (
          <li key={state}>
            <i className={`sq ${state}`} aria-hidden="true" />
            <b>{counts[state].toLocaleString()}</b> {label}
          </li>
        ))}
      </ul>
      <ol className="unit-rows" style={{ "--cols": perRow } as React.CSSProperties}>
        {units.map(({ unit, cells, known }, i) => (
          <li key={unit.id}>
            <Link href={`/words#${unit.id}`} className="unit-row">
              <span className="unit-no" aria-hidden="true">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="unit-name">
                <span className="unit-title">{unit.title}</span>
                <span className="unit-desc">{unit.description}</span>
              </span>
              <span className="unit-squares" aria-hidden="true">
                {cells.map(({ word, state }) => (
                  <i key={word.term} className={`sq ${state}`} title={`${word.term} · ${word.meaning}`} />
                ))}
              </span>
              <span className="unit-count">
                <b>{known}</b>/{cells.length}
                <span className="sr-only"> words learned</span>
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </div>
  );
}
