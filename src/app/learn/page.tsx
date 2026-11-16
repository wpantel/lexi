"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ChoiceQuestion, PosLabel, ResultMark, SessionFrame, SessionShell, Term, WordRows, useKeys } from "@/components/Session";
import { SpeakButton } from "@/components/SpeakButton";
import { currentLanguage as lang, type Word } from "@/lib/language";
import { optionsFor, shuffle } from "@/lib/quiz";
import { speak } from "@/lib/speech";
import { markLearned, nextNewWords, progressFor, summary, useAppState, useHydrated, type State } from "@/lib/store";

type Step =
  | { type: "intro"; word: Word }
  | { type: "quiz"; word: Word; prompt: "term" | "meaning"; options: Word[] };

const CHUNK = 4;

/**
 * Meet a few words, then retrieve them straight away in both directions, and
 * once more at the end after other words have got in the way.
 */
function buildSteps(words: Word[]): Step[] {
  const quiz = (word: Word, prompt: "term" | "meaning"): Step => ({ type: "quiz", word, prompt, options: optionsFor(word, lang) });
  const steps: Step[] = [];
  for (let i = 0; i < words.length; i += CHUNK) {
    const chunk = words.slice(i, i + CHUNK);
    chunk.forEach((word) => steps.push({ type: "intro", word }));
    shuffle(chunk).forEach((w) => steps.push(quiz(w, "term")));
    shuffle(chunk).forEach((w) => steps.push(quiz(w, "meaning")));
  }
  if (words.length > CHUNK) shuffle(words).forEach((w) => steps.push(quiz(w, "meaning")));
  return steps;
}

function pickWords(state: State): Word[] {
  const progress = progressFor(state, lang.code);
  const s = summary(lang, progress, state.settings, Date.now());
  return nextNewWords(lang, progress, s.newLeftToday || state.settings.dailyNew);
}

function Intro({ word, index, total, autoSpeak, showReading, onNext }: {
  word: Word;
  index: number;
  total: number;
  autoSpeak: boolean;
  showReading: boolean;
  onNext: () => void;
}) {
  useEffect(() => {
    if (autoSpeak) speak(word.term, lang.speechLang);
  }, [word.term, autoSpeak]);
  useKeys((key) => {
    if (key === "Enter" || key === " ") {
      onNext();
      return true;
    }
  });
  return (
    <>
      <div className="stage card">
        <div className="prompt-label">
          New word {index} of {total}
        </div>
        <Term word={word} lang={lang} />
        {showReading && <div className="hero-reading">{word.reading}</div>}
        <div style={{ margin: "14px 0 4px" }}>
          <SpeakButton text={word.term} lang={lang.speechLang} />
        </div>
        <div className="answer">
          <div className="hero-meaning">{word.meaning}</div>
          <PosLabel word={word} />
        </div>
      </div>
      <div className="dock">
        <div className="hint">Say it out loud once. It helps more than you&apos;d think.</div>
        <button type="button" className="btn btn-primary btn-block" onClick={onNext}>
          Got it
        </button>
      </div>
    </>
  );
}

function LearnSession({ onRestart }: { onRestart: () => void }) {
  const state = useAppState();
  const [words] = useState(() => pickWords(state));
  const [steps, setSteps] = useState(() => buildSteps(words));
  const [index, setIndex] = useState(0);
  const { showReading, autoSpeak } = state.settings;

  if (words.length === 0) {
    return (
      <SessionShell>
        <div className="result">
          <ResultMark />
          <h1>You&apos;ve met every word</h1>
          <p>All {lang.words.length.toLocaleString()} words are in your review schedule now. Keep up the reviews to hold on to them.</p>
        </div>
        <Link href="/" className="btn btn-primary btn-block">
          Done
        </Link>
      </SessionShell>
    );
  }

  if (index >= steps.length) {
    return (
      <SessionShell>
        <div className="result">
          <ResultMark />
          <h1>
            {words.length} new {words.length === 1 ? "word" : "words"} learned
          </h1>
          <p>You&apos;ll see them again tomorrow, then at longer and longer gaps as they settle in.</p>
        </div>
        <WordRows words={words} lang={lang} />
        <div className="dock">
          <Link href="/" className="btn btn-primary btn-block">
            Done
          </Link>
          <button type="button" className="btn btn-block" onClick={onRestart}>
            Learn more words
          </button>
        </div>
      </SessionShell>
    );
  }

  const step = steps[index];
  const next = () => setIndex((i) => i + 1);

  return (
    <SessionFrame label="Lesson progress" done={index} total={steps.length}>
      {step.type === "intro" ? (
        <Intro
          key={index}
          word={step.word}
          index={words.indexOf(step.word) + 1}
          total={words.length}
          autoSpeak={autoSpeak}
          showReading={showReading}
          onNext={next}
        />
      ) : (
        <ChoiceQuestion
          key={index}
          word={step.word}
          options={step.options}
          prompt={step.prompt}
          lang={lang}
          showReading={showReading}
          autoSpeak={autoSpeak}
          onAnswer={(correct) => {
            if (correct) {
              if (step.prompt === "term") markLearned(lang.code, step.word.term);
            } else {
              // Missed words come back a few questions later, with fresh options.
              setSteps((all) => {
                const copy = [...all];
                const retry: Step = { ...step, options: optionsFor(step.word, lang) };
                copy.splice(Math.min(index + 4, copy.length), 0, retry);
                return copy;
              });
            }
          }}
          onNext={next}
        />
      )}
    </SessionFrame>
  );
}

export default function LearnPage() {
  const hydrated = useHydrated();
  const [run, setRun] = useState(0);
  if (!hydrated) return <SessionShell />;
  return <LearnSession key={run} onRestart={() => setRun((r) => r + 1)} />;
}
