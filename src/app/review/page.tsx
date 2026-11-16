"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PosLabel, ResultMark, SessionFrame, SessionShell, Term, useKeys } from "@/components/Session";
import { SpeakButton } from "@/components/SpeakButton";
import { currentLanguage as lang, type Word } from "@/lib/language";
import { speak } from "@/lib/speech";
import { DAY, GRADES, GRADE_LABEL, previewIntervals, startOfDay, type Card, type Grade } from "@/lib/srs";
import { dueTerms, gradeCard, progressFor, summary, useAppState, useHydrated } from "@/lib/store";

function ReviewCard({ word, card, showReading, autoSpeak, onGrade }: {
  word: Word;
  card: Card;
  showReading: boolean;
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
      <div className="stage card">
        {produce ? (
          <>
            <div className="prompt-label">How do you say this in {lang.name}?</div>
            <div className="hero-meaning">{word.meaning}</div>
            <PosLabel word={word} />
            {revealed && (
              <div className="answer">
                <Term word={word} lang={lang} />
                {showReading && <div className="hero-reading">{word.reading}</div>}
                <div style={{ marginTop: 12 }}>
                  <SpeakButton text={word.term} lang={lang.speechLang} />
                </div>
              </div>
            )}
          </>
        ) : (
          <>
            <div className="prompt-label">What does this mean?</div>
            <Term word={word} lang={lang} />
            {showReading && <div className="hero-reading">{word.reading}</div>}
            <div style={{ margin: "14px 0 4px" }}>
              <SpeakButton text={word.term} lang={lang.speechLang} />
            </div>
            {revealed && (
              <div className="answer">
                <div className="hero-meaning">{word.meaning}</div>
                <PosLabel word={word} />
              </div>
            )}
          </>
        )}
      </div>

      <div className="dock">
        {revealed ? (
          <>
            <div className="hint">How well did you remember it?</div>
            <div className="grades">
              {GRADES.map((g) => (
                <button key={g} type="button" className={`grade ${g}`} onClick={() => onGrade(g)}>
                  {GRADE_LABEL[g]}
                  <small>{intervals[g]}</small>
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
          <ResultMark />
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
