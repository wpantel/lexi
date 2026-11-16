// Spaced repetition, SM-2 style: each successful recall pushes the next review
// further out; a miss brings the word back today.

export type Card = {
  /** Multiplier applied to the interval on a successful review. */
  ease: number;
  /** Days until the next review after the last grade. 0 = still being relearned. */
  interval: number;
  /** Timestamp when the card becomes due. */
  due: number;
  /** Successful reviews in a row. */
  reps: number;
  lapses: number;
  learnedAt: number;
};

export type Grade = "again" | "hard" | "good" | "easy";
export const GRADES: Grade[] = ["again", "hard", "good", "easy"];
export const GRADE_LABEL: Record<Grade, string> = { again: "Again", hard: "Hard", good: "Good", easy: "Easy" };

export const DAY = 24 * 60 * 60 * 1000;
/** A word counts as mastered once its review interval reaches three weeks. */
export const MASTERED_INTERVAL = 21;

export function startOfDay(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function dayKey(ts: number): string {
  const d = new Date(ts);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

export function newCard(now: number): Card {
  return { ease: 2.5, interval: 1, due: startOfDay(now) + DAY, reps: 0, lapses: 0, learnedAt: now };
}

function nextInterval(card: Card, grade: Grade): number {
  const { interval, ease, reps } = card;
  switch (grade) {
    case "again":
      return 0;
    case "hard":
      return Math.max(1, Math.round(interval * 1.2));
    case "good":
      if (interval === 0 || reps === 0) return 1;
      if (reps === 1) return 3;
      return Math.max(interval + 1, Math.round(interval * ease));
    case "easy":
      if (interval === 0 || reps === 0) return 4;
      return Math.max(interval + 2, Math.round(interval * ease * 1.3));
  }
}

export function schedule(card: Card, grade: Grade, now: number): Card {
  const interval = nextInterval(card, grade);
  if (grade === "again") {
    return {
      ...card,
      interval,
      due: now,
      reps: 0,
      lapses: card.lapses + 1,
      ease: Math.max(1.3, card.ease - 0.2),
    };
  }
  const easeDelta = grade === "hard" ? -0.15 : grade === "easy" ? 0.15 : 0;
  return {
    ...card,
    interval,
    due: startOfDay(now) + interval * DAY,
    reps: card.reps + 1,
    ease: Math.max(1.3, card.ease + easeDelta),
  };
}

/** What each grade button would do, for showing on the buttons. */
export function previewIntervals(card: Card): Record<Grade, string> {
  return {
    again: "today",
    hard: formatInterval(nextInterval(card, "hard")),
    good: formatInterval(nextInterval(card, "good")),
    easy: formatInterval(nextInterval(card, "easy")),
  };
}

export function formatInterval(days: number): string {
  if (days <= 0) return "today";
  if (days === 1) return "1 day";
  if (days < 14) return `${days} days`;
  if (days < 60) return `${Math.round(days / 7)} weeks`;
  if (days < 365) return `${Math.round(days / 30)} months`;
  const years = Math.round((days / 365) * 10) / 10;
  return `${years} ${years === 1 ? "year" : "years"}`;
}

/** How firmly a word is held, 1 to 4, from the gap it has survived: under 3 days, under a week, under 3 weeks, mastered. */
export function strengthOf(card: Card): number {
  if (card.interval >= MASTERED_INTERVAL) return 4;
  if (card.interval >= 7) return 3;
  if (card.interval >= 3) return 2;
  return 1;
}

export type Status = "new" | "learning" | "mastered";

export function statusOf(card: Card | undefined): Status {
  if (!card) return "new";
  return card.interval >= MASTERED_INTERVAL ? "mastered" : "learning";
}
