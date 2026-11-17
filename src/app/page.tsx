"use client";

import Link from "next/link";
import { Cells } from "@/components/Cells";
import { Contents } from "@/components/Contents";
import { ArrowIcon, SpeakerIcon } from "@/components/Icons";
import { Mark } from "@/components/Session";
import { currentLanguage as lang } from "@/lib/language";
import { DAY, startOfDay } from "@/lib/srs";
import { lastSevenDays, nextNewWords, progressFor, summary, useAppState, useHydrated } from "@/lib/store";

// Each mode is drawn as what you are shown and what you answer with.
const PRACTICE = [
  { mode: "meaning", title: "Meaning", sub: `See the ${lang.name} word, pick what it means`, from: "가", to: "A" },
  { mode: "recall", title: "Recall", sub: `See the meaning, pick the ${lang.name} word`, from: "A", to: "가" },
  { mode: "listening", title: "Listening", sub: "Hear the word, pick what it means", from: null, to: "A" },
];

type StepState = "now" | "done" | "later";

function nextDueLabel(ts: number, now: number): string {
  const days = Math.round((startOfDay(ts) - startOfDay(now)) / DAY);
  if (days <= 0) return "later today";
  if (days === 1) return "tomorrow";
  return `in ${days} days`;
}

const plural = (n: number, word = "word") => `${n} ${n === 1 ? word : `${word}s`}`;

/** One line of today's plan. The number square is ticked off in marking pen once the step is done. */
function Step({ n, state, label, children }: { n: number; state: StepState; label: string; children: React.ReactNode }) {
  return (
    <li className={`step ${state}`}>
      <span className="step-no" aria-hidden="true">
        {n}
        {state === "done" && <Mark right size={54} />}
      </span>
      <div className="step-body">
        <div className="step-label">
          {label}
          {state === "done" && <span className="step-state">Done</span>}
          {state === "now" && <span className="step-state">Up next</span>}
        </div>
        {children}
      </div>
    </li>
  );
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
  const weekTotal = week.reduce((n, d) => n + d.count, 0);
  const studiedToday = week[6].count > 0;
  // The run of days that makes up the streak: back from today, or from yesterday if today is still blank.
  let streakFrom = studiedToday ? 6 : 5;
  while (streakFrom >= 0 && week[streakFrom].count > 0) streakFrom--;
  const inStreak = (i: number) => i > streakFrom && week[i].count > 0;
  const streakState = s.streak === 0 ? "none" : studiedToday ? "kept" : "open";
  const firstRun = s.learned === 0;
  const hasDue = s.due.length > 0;
  const allMet = s.remaining === 0;
  const goalMet = s.newLeftToday === 0;

  const reviewState: StepState = hasDue ? "now" : firstRun ? "later" : "done";
  const learnState: StepState = allMet || goalMet ? "done" : hasDue ? "later" : "now";
  const practiceState: StepState = reviewState !== "now" && learnState === "done" ? "now" : "later";

  return (
    <main className="page">
      <header className="masthead">
        <div>
          <p className="dateline">
            {new Date(now).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
            <span lang={lang.code}> · {lang.nativeName}</span>
          </p>
          <h1 className="title">Today</h1>
        </div>

        {/* The last seven days as a register: one square a day, with the cards studied written in. */}
        <div className="register">
          <div className="register-row">
            {/* The streak is a tally block at the head of the register; its days are underlined in red pen. */}
            <p className={`streak ${streakState}`}>
              <b>{s.streak}</b>
              <span>day{s.streak === 1 ? "" : "s"} in a row</span>
            </p>
            <div className="register-days" role="img" aria-label={`Last seven days: ${plural(weekTotal, "card")} studied.`}>
              {week.map((d, i) => {
                const name = new Date(d.ts).toLocaleDateString(undefined, { weekday: "long" });
                return (
                  <div
                    key={d.ts}
                    className={`register-day ${d.isToday ? "today" : ""} ${d.count > 0 ? "on" : ""} ${inStreak(i) ? "run" : ""}`}
                    title={`${name}: ${plural(d.count, "card")}`}
                  >
                    <span>{name.slice(0, 2)}</span>
                    <b>{d.count > 0 ? d.count : ""}</b>
                  </div>
                );
              })}
            </div>
          </div>
          <p className="register-note">
            {streakState === "open" ? (
              <strong>Study today to keep your streak</strong>
            ) : streakState === "none" ? (
              "Study today to start a streak"
            ) : (
              "Streak kept for today"
            )}{" "}
            · {plural(weekTotal, "card")} this week
          </p>
        </div>
      </header>

      <ol className="plan" aria-label="Today's plan">
        <Step n={1} state={reviewState} label="Review">
          {hasDue ? (
            <>
              <h2>
                <mark>{plural(s.due.length)}</mark> {s.due.length === 1 ? "is" : "are"} ready for review
              </h2>
              <p>These are close to slipping away. Recalling them now is what moves them into long-term memory.</p>
              <div className="peek" aria-hidden="true">
                {dueWords.map((w) => (
                  <Cells key={w.term} text={w.term} lang={lang.code} size="mini" />
                ))}
              </div>
              <div className="step-actions">
                <Link href="/review" className="btn btn-primary">
                  Start review <ArrowIcon />
                </Link>
              </div>
            </>
          ) : (
            <>
              <h2>{firstRun ? "Nothing to review yet" : "No reviews due"}</h2>
              <p>
                {s.nextDue
                  ? `Your next review is ${nextDueLabel(s.nextDue, now)}.`
                  : "Words you learn come back here just before you would forget them."}
              </p>
            </>
          )}
        </Step>

        <Step n={2} state={learnState} label="New words">
          {allMet ? (
            <>
              <h2>You have met every word</h2>
              <p>All {s.total.toLocaleString()} words are in your review schedule. Reviews are what keep them now.</p>
            </>
          ) : (
            <>
              <h2>
                {firstRun
                  ? `Start with your first ${batch} words`
                  : goalMet
                    ? `You learned ${plural(s.today.learned, "new word")} today`
                    : `${plural(s.newLeftToday, "new word")} to learn today`}
              </h2>
              <p>
                {firstRun
                  ? "Meet a few words, get quizzed on them straight away, then review each one just before you would forget it. About ten minutes a day is enough."
                  : goalMet
                    ? "Small daily batches stick better than big ones. Come back tomorrow, or keep going if you have the energy."
                    : "The most common words come first, so everything you learn is useful right away."}
              </p>
              {learnState === "now" && (
                <div className="peek" aria-hidden="true">
                  {upcoming.map((w) => (
                    <Cells key={w.term} text={w.term} lang={lang.code} size="mini" />
                  ))}
                </div>
              )}
              <div className="step-actions">
                <Link href="/learn" className={`btn ${learnState === "now" ? "btn-primary" : ""}`}>
                  {firstRun ? "Start learning" : goalMet ? `Learn ${batch} more` : `Learn ${plural(s.newLeftToday, "new word")}`}
                  {learnState === "now" && <ArrowIcon />}
                </Link>
                {learnState === "later" && <span className="muted">Best after your review</span>}
              </div>
            </>
          )}
        </Step>

        <Step n={3} state={practiceState} label="Practice · optional">
          <h2>Quiz yourself on words you know</h2>
          <p>Extra rounds of ten questions. They don&apos;t change your review schedule.</p>
          <div className="modes">
            {PRACTICE.map((p) => (
              <Link key={p.mode} href={`/practice/${p.mode}`} className="mode">
                <span className="mode-glyph" aria-hidden="true">
                  <b lang={p.from === "가" ? lang.code : undefined}>{p.from ?? <SpeakerIcon size={18} />}</b>
                  <ArrowIcon size={14} />
                  <b lang={p.to === "가" ? lang.code : undefined}>{p.to}</b>
                </span>
                <span className="mode-text">
                  <span className="mode-title">{p.title}</span>
                  <span className="mode-sub">{p.sub}</span>
                </span>
              </Link>
            ))}
          </div>
        </Step>
      </ol>

      <div className="section-head">
        <h2>Contents</h2>
        <p>
          {s.total.toLocaleString()} words in {lang.units.length} units, most essential first. One square per word
          {firstRun ? "; they fill in as you learn." : `; ${s.learned.toLocaleString()} filled in so far.`}
        </p>
      </div>
      <Contents lang={lang} progress={progress} now={now} />
    </main>
  );
}
