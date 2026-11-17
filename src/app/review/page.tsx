"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PosLabel, SessionFrame, SessionShell, Stamp, StageTab, Term, useKeys } from "@/components/Session";
import { SpeakButton } from "@/components/SpeakButton";
import { currentLanguage as lang, type Word } from "@/lib/language";
import { speak } from "@/lib/speech";
import { DAY, GRADES, GRADE_LABEL, previewIntervals, startOfDay, type Card, type Grade } from "@/lib/srs";
import { dueTerms, gradeCard, progressFor, summary, useAppState, useHydrated } from "@/lib/store";

function ReviewCard({ word, card, showReading, showJamo, autoSpeak, onGrade }: {
  word: Word;
  card: Card;
  showReading: boolean;
  showJamo: boolean;
  autoSpeak: boolean;
  onGrade: (g: Grade) => void;
}) {
  const [revealed, setRevealed] = useState(false);
  // Once a word has stuck a couple of times, alternate to the harder direction:
  // producing the word from its meaning.
  const produce = card.reps >= 2 && card.reps % 2 === 0;
  const intervals = previewIntervals(card);

  useEffect(() => {
    if (autoSpeak && !produce) speak(word.term, lang.speechLang);
  }, [word.term, autoSpeak, produce]);

  const reveal = () => {
    setRevealed(true);
    if (autoSpeak && produce) speak(word.term, lang.speechLang);
  };

  useKeys((key) => {
    if (!revealed) {
      if (key === " " || key === "Enter") {
        reveal();
        return true;
      }
      return;
    }
    const i = Number(key) - 1;
    if (i >= 0 && i < GRADES.length) {
      onGrade(GRADES[i]);
      return true;
    }
    if (key === " " || key === "Enter") {
      onGrade("good");
      return true;
    }
  });

  return (
    <>
      <div className="stage flashcard">
        <div className="flash-front">
          {produce ? (
            <>
              <StageTab>How do you say this in {lang.name}?</StageTab>
              <div className="hero-meaning">{word.meaning}</div>
              <PosLabel word={word} />
            </>
          ) : (
            <>
              <StageTab>What does this mean?</StageTab>
              <Term word={word} lang={lang} />
              {showReading && <div className="hero-reading">{word.reading}</div>}
              <div className="stage-listen">
                <SpeakButton text={word.term} lang={lang.speechLang} showLabel />
              </div>
            </>
          )}
        </div>

        {/* The answer is on the card all along, under a memorising sheet that lifts away. */}
        <div className={`flash-back ${revealed ? "open" : ""}`}>
          <div className="flash-answer" inert={!revealed}>
            {produce ? (
              <>
                <Term word={word} lang={lang} breakdown={showJamo} />
                {showReading && <div className="hero-reading">{word.reading}</div>}
                <div className="stage-listen">
                  <SpeakButton text={word.term} lang={lang.speechLang} showLabel />
                </div>
              </>
            ) : (
              <>
                <div className="hero-meaning">{word.meaning}</div>
                <PosLabel word={word} />
              </>
            )}
          </div>
          <button type="button" className="flash-cover" onClick={reveal} disabled={revealed} aria-hidden={revealed}>
            <b>Answer covered</b>
            <span>Say it in your head, then lift the sheet</span>
          </button>
        </div>
      </div>

      <div className="dock pinned">
        {revealed ? (
          <>
            <div className="hint" id="grade-hint">
              How well did you remember it? Each answer sets when you see it next.
            </div>
            <div className="grades" role="group" aria-labelledby="grade-hint">
              {GRADES.map((g, i) => (
                <button key={g} type="button" className={`grade ${g}`} onClick={() => onGrade(g)}>
                  <span className="kbd" aria-hidden="true">
                    {i + 1}
                  </span>
                  <b>{GRADE_LABEL[g]}</b>
                  <small>
                    <span className="sr-only">, see it again </span>
                    {g === "again" ? "today" : `in ${intervals[g]}`}
                  </small>
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <div className="hint">Say the answer in your head first.</div>
            <button type="button" className="btn btn-primary btn-block" onClick={reveal}>
              Show answer <span className="kbd">space</span>
            </button>
          </>
        )}
      </div>
    </>
  );
}

function ReviewSession() {
  const state = useAppState();
  const progress = progressFor(state, lang.code);
  const [queue, setQueue] = useState(() => dueTerms(progress, Date.now()));
  const [index, setIndex] = useState(0);
  const [missed, setMissed] = useState(0);

  if (queue.length === 0 || index >= queue.length) {
    // eslint-disable-next-line react-hooks/purity -- summary of "now".
    const now = Date.now();
    const s = summary(lang, progress, state.settings, now);
    const days = s.nextDue ? Math.round((startOfDay(s.nextDue) - startOfDay(now)) / DAY) : null;
    const reviewed = new Set(queue).size;
    return (
      <SessionShell>
        <div className="result">
          {queue.length > 0 && <Stamp />}
          <h1>{queue.length === 0 ? "Nothing to review right now" : "Review complete"}</h1>
          <p>
            {queue.length > 0 &&
              `${reviewed} ${reviewed === 1 ? "word" : "words"} reviewed${missed > 0 ? `, ${missed} needed a second look` : ""}. `}
            {days !== null && `Next review ${days <= 0 ? "later today" : days === 1 ? "tomorrow" : `in ${days} days`}.`}
            {days === null && queue.length === 0 && "Learn some words first and they will show up here when it is time."}
          </p>
        </div>
        <div className="dock" style={{ marginTop: 24 }}>
          <Link href="/" className="btn btn-primary btn-block">
            Done
          </Link>
          {s.remaining > 0 && (
            <Link href="/learn" className="btn btn-block">
              Learn new words
            </Link>
          )}
        </div>
      </SessionShell>
    );
  }

  const term = queue[index];
  const word = lang.byTerm.get(term);
  const card = progress.cards[term];
  if (!word || !card) {
    // The word left the course or progress was reset in another tab.
    return (
      <SessionShell>
        <div className="result">
          <h1>This review is out of date</h1>
          <p>Your progress changed somewhere else. Head back to Today to pick up where things stand.</p>
        </div>
        <Link href="/" className="btn btn-primary btn-block">
          Back to Today
        </Link>
      </SessionShell>
    );
  }

  return (
    <SessionFrame label="Review progress" done={index} total={queue.length}>
      <ReviewCard
        key={index}
        word={word}
        card={card}
        showReading={state.settings.showReading}
        showJamo={state.settings.showJamo}
        autoSpeak={state.settings.autoSpeak}
        onGrade={(g) => {
          gradeCard(lang.code, term, g);
          if (g === "again") {
            // Missed words come back at the end of this session.
            setQueue((q) => [...q, term]);
            setMissed((m) => m + 1);
          }
          setIndex((i) => i + 1);
        }}
      />
    </SessionFrame>
  );
}

export default function ReviewPage() {
  const hydrated = useHydrated();
  if (!hydrated) return <SessionShell />;
  return <ReviewSession />;
}
