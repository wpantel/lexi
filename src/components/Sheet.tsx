import type { Language } from "@/lib/language";
import { statusOf } from "@/lib/srs";
import type { Progress } from "@/lib/store";

type CellState = "new" | "learning" | "mastered" | "due";

const LEGEND: { state: CellState; label: string }[] = [
  { state: "due", label: "Due now" },
  { state: "learning", label: "Learning" },
  { state: "mastered", label: "Mastered" },
  { state: "new", label: "To go" },
];

/**
 * The whole course as one sheet of manuscript paper: a square per word, a row
 * per unit, filling in as words are learned.
 */
export function Sheet({ lang, progress, now }: { lang: Language; progress: Progress; now: number }) {
  const counts: Record<CellState, number> = { new: 0, learning: 0, mastered: 0, due: 0 };
  const rows = lang.units.map((u) =>
    u.words.map((w) => {
      const card = progress.cards[w.term];
      const state: CellState = !card ? "new" : card.due <= now ? "due" : statusOf(card) === "mastered" ? "mastered" : "learning";
      counts[state]++;
      return { word: w, state };
    }),
  );
  const columns = Math.max(...rows.map((r) => r.length));

  return (
    <div className="sheet">
      <div
        className="sheet-grid"
        role="img"
        aria-label={`Course map: ${counts.due} due now, ${counts.learning} learning, ${counts.mastered} mastered, ${counts.new} still to learn.`}
        style={{ "--cols": columns } as React.CSSProperties}
      >
        {rows.flat().map(({ word, state }) => (
          <i key={word.term} className={state} title={`${word.term} · ${word.meaning}`} />
        ))}
      </div>
      <ul className="sheet-legend">
        {LEGEND.map(({ state, label }) => (
          <li key={state}>
            <i className={state} aria-hidden="true" />
            <b>{counts[state].toLocaleString()}</b> {label.toLowerCase()}
          </li>
        ))}
      </ul>
    </div>
  );
}
