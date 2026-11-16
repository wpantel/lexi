"use client";

import Link from "next/link";
import { ChevronIcon } from "@/components/Icons";
import { currentLanguage as lang } from "@/lib/language";
import { DAY, startOfDay } from "@/lib/srs";
import { lastSevenDays, nextNewWords, progressFor, summary, useAppState, useHydrated } from "@/lib/store";

const PRACTICE = [
  { mode: "meaning", title: "Meaning", sub: `See the ${lang.name} word, pick what it means` },
  { mode: "recall", title: "Recall", sub: `See the meaning, pick the ${lang.name} word` },
  { mode: "listening", title: "Listening", sub: "Hear the word, pick what it means" },
];

function nextDueLabel(ts: number, now: number): string {
  const days = Math.round((startOfDay(ts) - startOfDay(now)) / DAY);
  if (days <= 0) return "later today";
  if (days === 1) return "tomorrow";
  return `in ${days} days`;
}

export default function TodayPage() {
  const hydrated = useHydrated();
  const state = useAppState();
  if (!hydrated) return <main className="page" />;

  // eslint-disable-next-line react-hooks/purity -- the page is a view of "now".
  const now = Date.now();
  const progress = progressFor(state, lang.code);
  const s = summary(lang, progress, state.settings, now);
  const dueWords = s.due.slice(0, 6).map((t) => lang.byTerm.get(t)).filter((w) => !!w);
  const upcoming = nextNewWords(lang, progress, 6);
  const batch = Math.min(state.settings.dailyNew, s.remaining);
  const week = lastSevenDays(progress, now);
  const weekMax = Math.max(1, ...week.map((d) => d.count));
  const weekTotal = week.reduce((n, d) => n + d.count, 0);
  const firstRun = s.learned === 0;
  const hasDue = s.due.length > 0;
  const goalMet = s.newLeftToday === 0;

  return (
    <main className="page">
      <header className="page-head">
        <div>
          <div className="eyebrow">
            {new Date(now).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
          </div>
          <h1 className="title">Today</h1>
        </div>
        <span className="chip">
          <span lang={lang.code}>{lang.nativeName}</span> {lang.name}
        </span>
      </header>

      {hasDue && (
        <section className="card focus-card">
          <span className="tag due">Review</span>
          <h2>
            {s.due.length} {s.due.length === 1 ? "word is" : "words are"} ready for review
          </h2>
          <p>These are close to slipping away. Recalling them now is what moves them into long-term memory.</p>
          <div className="peek" lang={lang.code} aria-hidden="true">
            {dueWords.map((w) => (
              <span key={w.term}>{w.term}</span>
            ))}
          </div>
          <div className="focus-actions">
            <Link href="/review" className="btn btn-primary">
              Start review
            </Link>
          </div>
        </section>
      )}

      {s.remaining > 0 && (
        <section className="card focus-card">
          <span className={`tag ${goalMet ? "done" : "new"}`}>{goalMet ? "Goal met" : "New words"}</span>
          <h2>
            {firstRun
              ? `Start with your first ${batch} words`
              : goalMet
                ? `You learned ${s.today.learned} new ${s.today.learned === 1 ? "word" : "words"} today`
                : `${s.newLeftToday} new ${s.newLeftToday === 1 ? "word" : "words"} to learn today`}
          </h2>
          <p>
            {firstRun
              ? "Meet a few words, get quizzed on them straight away, then review each one just before you would forget it. About ten minutes a day is enough."
              : goalMet
                ? "Small daily batches stick better than big ones. Come back tomorrow, or keep going if you have the energy."
                : "The most common words come first, so everything you learn is useful right away."}
          </p>
          <div className="peek" lang={lang.code} aria-hidden="true">
            {upcoming.map((w) => (
              <span key={w.term}>{w.term}</span>
            ))}
          </div>
          <div className="focus-actions">
            <Link href="/learn" className={`btn ${hasDue || goalMet ? "" : "btn-primary"}`}>
              {firstRun ? "Start learning" : goalMet ? `Learn ${batch} more` : `Learn ${s.newLeftToday} new words`}
            </Link>
            {hasDue && !goalMet && <span className="muted">Best after your review</span>}
          </div>
        </section>
      )}

      {!hasDue && s.remaining === 0 && (
        <section className="card focus-card">
          <span className="tag done">All caught up</span>
          <h2>Nothing to review right now</h2>
          <p>You have met every word in the course. {s.nextDue && `Your next review is ${nextDueLabel(s.nextDue, now)}.`}</p>
        </section>
      )}

      <div className="stats">
        <div className="card stat">
          <div className="stat-label">Streak</div>
          <div className="stat-value">
            {s.streak} <small>{s.streak === 1 ? "day" : "days"}</small>
          </div>
        </div>
        <div className="card stat">
          <div className="stat-label">Learned</div>
          <div className="stat-value">
            {s.learned} <small>of {s.total.toLocaleString()}</small>
          </div>
        </div>
        <div className="card stat">
          <div className="stat-label">Mastered</div>
          <div className="stat-value">
            {s.mastered} <small>{s.mastered === 1 ? "word" : "words"}</small>
          </div>
        </div>
      </div>

      <section className="card week" aria-label="Activity over the last seven days">
        <div className="week-head">
          <span>Last 7 days</span>
          <span className="muted">
            {weekTotal} {weekTotal === 1 ? "card" : "cards"} studied
          </span>
        </div>
        <div className="week-bars">
          {week.map((d) => {
            const name = new Date(d.ts).toLocaleDateString(undefined, { weekday: "long" });
            return (
              <div key={d.ts} className={`week-col ${d.isToday ? "today" : ""}`}>
                <div
                  className={`week-bar ${d.count > 0 ? "on" : ""}`}
                  style={{ height: d.count > 0 ? `${Math.max(12, (d.count / weekMax) * 100)}%` : undefined }}
                />
                <span aria-hidden="true">{name.slice(0, 2)}</span>
                <span className="sr-only">
                  {name}: {d.count} cards
                </span>
              </div>
            );
          })}
        </div>
      </section>

      <h2 className="section-title">Practice</h2>
      <p className="section-note">Extra quizzes on words you know. They don&apos;t change your review schedule.</p>
      <div className="card list">
        {PRACTICE.map((p) => (
          <Link key={p.mode} href={`/practice/${p.mode}`} className="row">
            <div className="row-main">
              <div className="row-title">{p.title}</div>
              <div className="row-sub">{p.sub}</div>
            </div>
            <span className="row-end">
              <ChevronIcon />
            </span>
          </Link>
        ))}
      </div>

      <h2 className="section-title">Course</h2>
      <p className="section-note">
        {s.total.toLocaleString()} words in {lang.units.length} units, most essential first.
      </p>
      <div className="card list">
        {lang.units.map((u, i) => {
          const known = u.words.filter((w) => progress.cards[w.term]).length;
          return (
            <Link key={u.id} href={`/words#${u.id}`} className="row">
              <span className="row-index" aria-hidden="true">
                {i + 1}
              </span>
              <div className="row-main">
                <div className="row-title">{u.title}</div>
                <div className="row-sub">{u.description}</div>
                <div className="meter" aria-hidden="true">
                  <div style={{ width: `${(known / u.words.length) * 100}%` }} />
                </div>
              </div>
              <span className="row-end">
                {known} of {u.words.length}
                <ChevronIcon />
              </span>
            </Link>
          );
        })}
      </div>
    </main>
  );
}
