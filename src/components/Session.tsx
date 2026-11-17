"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { Language, Word } from "@/lib/language";
import { POS_LABEL } from "@/lib/language";
import { speak } from "@/lib/speech";
import { Cells } from "./Cells";
import { CloseIcon } from "./Icons";
import { SpeakButton } from "./SpeakButton";

/**
 * The frame around a study session. With `marks`, progress is an answer sheet:
 * one square per question, marked right or wrong as each is answered.
 */
export function SessionFrame({
  label,
  done,
  total,
  marks,
  children,
}: {
  label: string;
  done: number;
  total: number;
  marks?: boolean[];
  children: React.ReactNode;
}) {
  const pct = total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0;
  return (
    <div className="session">
      <header className="session-bar">
        <Link href="/" className="icon-btn quiet" aria-label="Close and return to Today">
          <CloseIcon />
        </Link>
        {marks ? (
          <AnswerSheet results={marks} total={total} current={done} label={label} />
        ) : (
          <div className="progress" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
            <div style={{ transform: `scaleX(${pct / 100})` }} />
          </div>
        )}
        <span className="session-count">
          <b>{Math.min(done + 1, total)}</b>
          <span aria-hidden="true">/</span>
          <span className="sr-only"> of </span>
          {total}
        </span>
      </header>
      <main className="session-body">{children}</main>
    </div>
  );
}

export function SessionShell({ children }: { children?: React.ReactNode }) {
  return (
    <div className="session">
      <header className="session-bar">
        <Link href="/" className="icon-btn quiet" aria-label="Close and return to Today">
          <CloseIcon />
        </Link>
      </header>
      <main className="session-body">{children}</main>
    </div>
  );
}

/** Calls the handler for a key press, ignoring repeats and modified keys. */
export function useKeys(handler: (key: string) => boolean | void) {
  const ref = useRef(handler);
  useEffect(() => {
    ref.current = handler;
  });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
      // A focused control handles its own Enter and Space.
      const target = e.target as HTMLElement | null;
      if (target?.closest("input, textarea, select")) return;
      if ((e.key === "Enter" || e.key === " ") && target?.closest("button, a")) return;
      if (ref.current(e.key)) e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}

export function Term({ word, lang, breakdown = false }: { word: Word; lang: Language; breakdown?: boolean }) {
  return <Cells text={word.term} lang={lang.code} breakdown={breakdown} />;
}

/**
 * Korean marking: a right answer gets a circle (동그라미), a wrong one a cross,
 * both in the teacher's red pen. Always pair with text; the shape is the cue.
 * The circle is a slightly uneven loop that overshoots its start, as a hand draws it.
 */
export function Mark({ right, size = 22 }: { right: boolean; size?: number }) {
  return (
    <svg
      className={`mark ${right ? "o" : "x"}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      {right ? (
        <path pathLength="1" d="M13.6 3.4C7.9 2.3 3.2 6 3 11.6c-.2 5.3 3.7 9.2 8.9 9.3 5.2.1 9.1-3.6 9.1-8.8 0-4.9-3.5-8.7-9.4-8.9" />
      ) : (
        <>
          <path pathLength="1" d="M6 5.5 18.2 18.4" />
          <path pathLength="1" d="M18.3 5.6 5.8 18.5" />
        </>
      )}
    </svg>
  );
}

export function PosLabel({ word }: { word: Word }) {
  return <div className="pos">{POS_LABEL[word.pos] ?? word.pos}</div>;
}

/** The index tab on top of a question or card, saying what is being asked. */
export function StageTab({ children }: { children: React.ReactNode }) {
  return <div className="stage-tab">{children}</div>;
}

export type PromptKind = "term" | "meaning" | "audio";

/**
 * One multiple-choice question, laid out like an exam item: the answers are
 * numbered in circles and the right one gets circled. Mount with a fresh `key`
 * per question. A right answer moves on by itself; a wrong one waits so the
 * correction can be read.
 */
export function ChoiceQuestion({
  word,
  options,
  prompt,
  lang,
  showReading,
  autoSpeak,
  onAnswer,
  onNext,
}: {
  word: Word;
  options: Word[];
  prompt: PromptKind;
  lang: Language;
  showReading: boolean;
  autoSpeak: boolean;
  onAnswer: (correct: boolean) => void;
  onNext: () => void;
}) {
  const [picked, setPicked] = useState<string | null>(null);
  const answered = picked !== null;
  const correct = picked === word.term;
  const answersAreTerms = prompt === "meaning";

  useEffect(() => {
    if (prompt === "audio" || (prompt === "term" && autoSpeak)) speak(word.term, lang.speechLang);
  }, [word.term, prompt, autoSpeak, lang.speechLang]);

  useEffect(() => {
    if (!answered || !correct) return;
    const t = setTimeout(onNext, 900);
    return () => clearTimeout(t);
    // onNext is stable for the life of one question.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answered, correct]);

  const pick = (term: string) => {
    if (answered) return;
    setPicked(term);
    onAnswer(term === word.term);
    if (prompt === "meaning" && autoSpeak) speak(word.term, lang.speechLang);
  };

  useKeys((key) => {
    if (!answered) {
      const i = Number(key) - 1;
      if (i >= 0 && i < options.length) {
        pick(options[i].term);
        return true;
      }
    } else if (key === "Enter" || key === " ") {
      onNext();
      return true;
    }
  });

  return (
    <>
      <div className="stage compact">
        {prompt === "term" && (
          <>
            <StageTab>What does this mean?</StageTab>
            <Term word={word} lang={lang} />
            {showReading && <div className="hero-reading">{word.reading}</div>}
          </>
        )}
        {prompt === "meaning" && (
          <>
            <StageTab>How do you say this in {lang.name}?</StageTab>
            <div className="hero-meaning">{word.meaning}</div>
            <PosLabel word={word} />
          </>
        )}
        {prompt === "audio" && (
          <>
            <StageTab>Listen. What does it mean?</StageTab>
            <SpeakButton text={word.term} lang={lang.speechLang} variant="big" label="Play the word again" />
            {answered ? (
              <div className="answer">
                <Term word={word} lang={lang} />
                {showReading && <div className="hero-reading">{word.reading}</div>}
              </div>
            ) : (
              <div className="hero-reading">Tap to hear it again</div>
            )}
          </>
        )}
      </div>

      <div className="dock">
        <div className="choices" role="group" aria-label="Answers">
          {options.map((o, i) => {
            const isRight = answered && o.term === word.term;
            const isWrong = answered && o.term === picked && !correct;
            const cls = isRight ? "right" : isWrong ? "wrong" : answered ? "faded" : "";
            return (
              <button
                key={o.term}
                type="button"
                className={`choice ${answersAreTerms ? "term" : ""} ${cls}`}
                disabled={answered}
                onClick={() => pick(o.term)}
              >
                <span className="num" aria-hidden="true">
                  {i + 1}
                  {isRight && <Mark right size={46} />}
                  {isWrong && <Mark right={false} size={46} />}
                </span>
                <span className="choice-text" lang={answersAreTerms ? lang.code : undefined}>
                  {answersAreTerms ? o.term : o.meaning}
                </span>
                {isRight && <span className="choice-note">Correct{!correct && " answer"}</span>}
                {isWrong && <span className="choice-note">Your answer</span>}
              </button>
            );
          })}
        </div>
        <div className={`hint ${answered ? (correct ? "good" : "bad") : ""}`} aria-live="polite">
          {answered ? (
            correct ? (
              "Correct"
            ) : (
              `Not quite. ${word.term} means “${word.meaning}”.`
            )
          ) : (
            <span className="keys-hint">Press 1 to {options.length} to answer</span>
          )}
        </div>
        {answered && !correct && (
          <button type="button" className="btn btn-primary btn-block" onClick={onNext}>
            Continue <span className="kbd">space</span>
          </button>
        )}
      </div>
    </>
  );
}

/**
 * 참 잘했어요, "very well done": the red stamp a Korean teacher presses onto
 * good work. Marks the end of a finished session.
 */
export function Stamp() {
  return (
    <figure className="stamp-wrap">
      <svg className="stamp" viewBox="0 0 132 132" width="132" height="132" role="img" aria-label="A red teacher's stamp reading 참 잘했어요">
        <circle cx="66" cy="66" r="61" fill="none" stroke="currentColor" strokeWidth="3.5" />
        <circle cx="66" cy="66" r="53" fill="none" stroke="currentColor" strokeWidth="1.3" />
        <path d="M30 50h72M30 86h72" stroke="currentColor" strokeWidth="1.3" />
        <text x="66" y="74" textAnchor="middle" textLength="76" lengthAdjust="spacingAndGlyphs" fontSize="19" fontWeight="800" fill="currentColor" lang="ko">
          참 잘했어요
        </text>
        <path
          fill="currentColor"
          d="m66 24 2.4 5.2 5.6.6-4.2 3.8 1.2 5.6-5-2.900-5 2.900 1.200-5.600-4.200-3.800 5.600-.600zM66 93l2.400 5.200 5.600.600-4.200 3.800 1.200 5.600-5-2.900-5 2.900 1.200-5.600-4.200-3.800 5.600-.600z"
        />
      </svg>
      <figcaption>
        <span lang="ko">참 잘했어요</span> · “very well done”, the stamp a Korean teacher gives good work
      </figcaption>
    </figure>
  );
}

/** An answer sheet: one square per question, marked in the order they were answered. */
export function AnswerSheet({
  results,
  total = results.length,
  current,
  label,
  large = false,
}: {
  results: boolean[];
  total?: number;
  /** The question being answered now, if the sheet is still being filled in. */
  current?: number;
  label?: string;
  large?: boolean;
}) {
  const right = results.filter(Boolean).length;
  const summary = `${right} right, ${results.length - right} wrong`;
  return (
    <div
      className={`answer-sheet ${large ? "large" : ""}`}
      role="img"
      aria-label={label ? `${label}: question ${Math.min((current ?? 0) + 1, total)} of ${total}, ${summary} so far` : summary}
    >
      {Array.from({ length: total }, (_, i) => {
        const marked = i < results.length;
        const cls = marked ? (results[i] ? "right" : "wrong") : i === current ? "current" : "";
        return (
          <span key={i} className={cls}>
            {marked && <Mark right={results[i]} />}
          </span>
        );
      })}
    </div>
  );
}

/** Words set as glossary lines: the word, how it sounds, what it means. */
export function WordRows({ words, lang }: { words: Word[]; lang: Language }) {
  return (
    <div className="gloss result-list">
      {words.map((w) => (
        <div className="entry" key={w.term}>
          <div className="entry-term" lang={lang.code}>
            {w.term}
            <span className="entry-reading" lang="en">
              {w.reading}
            </span>
          </div>
          <div className="entry-meaning">
            {w.meaning} <i>{POS_LABEL[w.pos] ?? w.pos}</i>
          </div>
          <SpeakButton text={w.term} lang={lang.speechLang} variant="quiet" />
        </div>
      ))}
    </div>
  );
}
