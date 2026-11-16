"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { Language, Word } from "@/lib/language";
import { POS_LABEL } from "@/lib/language";
import { speak } from "@/lib/speech";
import { CheckIcon, CloseIcon } from "./Icons";
import { SpeakButton } from "./SpeakButton";

export function SessionFrame({
  label,
  done,
  total,
  children,
}: {
  label: string;
  done: number;
  total: number;
  children: React.ReactNode;
}) {
  const pct = total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0;
  return (
    <div className="session">
      <header className="session-bar">
        <Link href="/" className="icon-btn quiet" aria-label="Close and return to Today">
          <CloseIcon />
        </Link>
        <div className="progress" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
          <div style={{ width: `${pct}%` }} />
        </div>
        <span className="session-count">
          {Math.min(done + 1, total)} of {total}
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

export function Term({ word, lang, className = "" }: { word: Word; lang: Language; className?: string }) {
  return (
    <div lang={lang.code} className={`hero-term ${word.term.length > 5 ? "long" : ""} ${className}`}>
      {word.term}
    </div>
  );
}

export function PosLabel({ word }: { word: Word }) {
  return <div className="pos">{POS_LABEL[word.pos] ?? word.pos}</div>;
}

export type PromptKind = "term" | "meaning" | "audio";

/**
 * One multiple-choice question. Mount with a fresh `key` per question.
 * A right answer moves on by itself; a wrong one waits so the correction can be read.
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
      <div className="stage compact card">
        {prompt === "term" && (
          <>
            <div className="prompt-label">What does this mean?</div>
            <Term word={word} lang={lang} />
            {showReading && <div className="hero-reading">{word.reading}</div>}
          </>
        )}
        {prompt === "meaning" && (
          <>
            <div className="prompt-label">How do you say this in {lang.name}?</div>
            <div className="hero-meaning">{word.meaning}</div>
            <PosLabel word={word} />
          </>
        )}
        {prompt === "audio" && (
          <>
            <div className="prompt-label">Listen. What does it mean?</div>
            <SpeakButton text={word.term} lang={lang.speechLang} variant="big" label="Play the word again" />
            {answered && (
              <div className="answer">
                <Term word={word} lang={lang} />
                {showReading && <div className="hero-reading">{word.reading}</div>}
              </div>
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
                <span className="kbd" aria-hidden="true">
                  {i + 1}
                </span>
                <span className="choice-text" lang={answersAreTerms ? lang.code : undefined}>
                  {answersAreTerms ? o.term : o.meaning}
                </span>
                {isRight && (
                  <>
                    <CheckIcon size={20} />
                    <span className="sr-only">Correct answer</span>
                  </>
                )}
                {isWrong && (
                  <>
                    <CloseIcon size={20} />
                    <span className="sr-only">Your answer, incorrect</span>
                  </>
                )}
              </button>
            );
          })}
        </div>
        <div className="hint" aria-live="polite">
          {answered && (correct ? "Correct" : `Not quite. ${word.term} means “${word.meaning}”.`)}
        </div>
        {answered && !correct && (
          <button type="button" className="btn btn-primary btn-block" onClick={onNext}>
            Continue
          </button>
        )}
      </div>
    </>
  );
}

export function ResultMark() {
  return (
    <div className="result-mark" aria-hidden="true">
      <CheckIcon size={36} />
    </div>
  );
}

export function WordRows({ words, lang }: { words: Word[]; lang: Language }) {
  return (
    <div className="card list result-list">
      {words.map((w) => (
        <div className="row" key={w.term}>
          <div className="row-main">
            <div className="word-term" lang={lang.code}>
              {w.term}
              <span className="word-reading">{w.reading}</span>
            </div>
            <div className="row-sub">{w.meaning}</div>
          </div>
          <SpeakButton text={w.term} lang={lang.speechLang} variant="quiet" />
        </div>
      ))}
    </div>
  );
}
