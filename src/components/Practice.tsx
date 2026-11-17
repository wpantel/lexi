"use client";

import Link from "next/link";
import { useState } from "react";
import { AnswerSheet, ChoiceQuestion, SessionFrame, SessionShell, Stamp, WordRows, type PromptKind } from "@/components/Session";
import { currentLanguage as lang, type Word } from "@/lib/language";
import { optionsFor, shuffle } from "@/lib/quiz";
import { logPractice, progressFor, useAppState, useHydrated, type State } from "@/lib/store";

export const MODES: Record<string, { prompt: PromptKind; title: string }> = {
  meaning: { prompt: "term", title: "Meaning" },
  recall: { prompt: "meaning", title: "Recall" },
  listening: { prompt: "audio", title: "Listening" },
};

const LENGTH = 10;
const MIN_KNOWN = 5;

function buildQuiz(state: State) {
  const cards = progressFor(state, lang.code).cards;
  const known = lang.words.filter((w) => cards[w.term]);
  // Until a few words are learned, practise on the very first words of the course.
  const usingStarter = known.length < MIN_KNOWN;
  const pool = usingStarter ? lang.words.slice(0, 20) : known;
  // Lean towards words that have been missed before.
  const weight = (w: Word) => Math.random() + (cards[w.term]?.lapses ?? 0) * 0.25;
  const picked = [...pool].sort((a, b) => weight(b) - weight(a)).slice(0, LENGTH);
  return { usingStarter, questions: shuffle(picked).map((word) => ({ word, options: optionsFor(word, lang) })) };
}

function PracticeSession({ prompt, onRestart }: { prompt: PromptKind; onRestart: () => void }) {
  const state = useAppState();
  const [quiz] = useState(() => buildQuiz(state));
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<{ word: Word; correct: boolean }[]>([]);
  const total = quiz.questions.length;

  if (index >= total) {
    const missed = answers.filter((a) => !a.correct).map((a) => a.word);
    const right = total - missed.length;
    return (
      <SessionShell>
        <div className="result">
          {missed.length === 0 && <Stamp />}
          <p className="score" aria-hidden="true">
            <b>{right}</b>
            <span>/{total}</span>
          </p>
          <h1>
            {right} of {total} correct
          </h1>
          <AnswerSheet results={answers.map((a) => a.correct)} large />
          <p>
            {missed.length === 0
              ? "A clean run. Try another mode to test these words from a different angle."
              : "Marked the Korean way: a circle for right, a cross for wrong. Here are the ones to look at again."}
          </p>
        </div>
        {missed.length > 0 ? <WordRows words={missed} lang={lang} /> : <div style={{ height: 24 }} />}
        <div className="dock">
          <button type="button" className="btn btn-primary btn-block" onClick={onRestart}>
            Practice again
          </button>
          <Link href="/" className="btn btn-block">
            Done
          </Link>
        </div>
      </SessionShell>
    );
  }

  const q = quiz.questions[index];
  return (
    <SessionFrame label="Practice progress" done={index} total={total} marks={answers.map((a) => a.correct)}>
      {quiz.usingStarter && index === 0 && (
        <div className="hint">You haven&apos;t learned many words yet, so this uses the first words of the course.</div>
      )}
      <ChoiceQuestion
        key={index}
        word={q.word}
        options={q.options}
        prompt={prompt}
        lang={lang}
        showReading={state.settings.showReading}
        autoSpeak={state.settings.autoSpeak}
        onAnswer={(correct) => {
          logPractice(lang.code);
          setAnswers((a) => [...a, { word: q.word, correct }]);
        }}
        onNext={() => setIndex((i) => i + 1)}
      />
    </SessionFrame>
  );
}

export function Practice({ mode }: { mode: string }) {
  const hydrated = useHydrated();
  const [run, setRun] = useState(0);
  const config = MODES[mode];

  if (!config) {
    return (
      <SessionShell>
        <div className="result">
          <h1>That practice mode doesn&apos;t exist</h1>
          <p>Pick Meaning, Recall or Listening from the Today page.</p>
        </div>
        <Link href="/" className="btn btn-primary btn-block">
          Back to Today
        </Link>
      </SessionShell>
    );
  }
  if (!hydrated) return <SessionShell />;
  return <PracticeSession key={run} prompt={config.prompt} onRestart={() => setRun((r) => r + 1)} />;
}
