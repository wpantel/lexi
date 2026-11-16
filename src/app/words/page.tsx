"use client";

import { useDeferredValue, useState } from "react";
import { CheckIcon } from "@/components/Icons";
import { SpeakButton } from "@/components/SpeakButton";
import { currentLanguage as lang, type Word } from "@/lib/language";
import { statusOf, type Status } from "@/lib/srs";
import { progressFor, useAppState } from "@/lib/store";

type Filter = "all" | Status;
const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "new", label: "Not started" },
  { id: "learning", label: "Learning" },
  { id: "mastered", label: "Mastered" },
];

function matches(w: Word, q: string): boolean {
  return w.term.includes(q) || w.meaning.toLowerCase().includes(q) || w.reading.includes(q);
}

export default function WordsPage() {
  const state = useAppState();
  const cards = progressFor(state, lang.code).cards;
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const q = useDeferredValue(query).trim().toLowerCase();

  const units = lang.units
    .map((u) => ({
      ...u,
      shown: u.words.filter((w) => (filter === "all" || statusOf(cards[w.term]) === filter) && (!q || matches(w, q))),
    }))
    .filter((u) => u.shown.length > 0);
  const count = units.reduce((n, u) => n + u.shown.length, 0);

  return (
    <main className="page">
      <header className="page-head">
        <div>
          <div className="eyebrow">
            {lang.name} · {lang.words.length.toLocaleString()} words
          </div>
          <h1 className="title">Words</h1>
        </div>
      </header>

      <div className="filters">
        <input
          className="search"
          type="search"
          placeholder={`Search ${lang.name} or English`}
          aria-label="Search words"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="segmented" role="group" aria-label="Filter by progress">
          {FILTERS.map((f) => (
            <button key={f.id} type="button" aria-pressed={filter === f.id} onClick={() => setFilter(f.id)}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {(q || filter !== "all") && (
        <p className="section-note" style={{ margin: "14px 4px 0" }} aria-live="polite">
          {count} {count === 1 ? "word" : "words"}
        </p>
      )}

      {units.length === 0 && (
        <div className="empty">
          {q
            ? `No words match “${query.trim()}”. Try the English meaning or part of the ${lang.name} word.`
            : filter === "mastered"
              ? "No mastered words yet. A word is mastered once you remember it across a three-week gap."
              : "No words here yet. Start a lesson from Today."}
        </div>
      )}

      {units.map((u) => (
        <section key={u.id} id={u.id} className="unit-block">
          <h2 className="section-title">{u.title}</h2>
          <div className="card list">
            {u.shown.map((w) => {
              const status = statusOf(cards[w.term]);
              return (
                <div className="row" key={w.term}>
                  <div className="row-main">
                    <div className="word-term" lang={lang.code}>
                      {w.term}
                      {state.settings.showReading && <span className="word-reading">{w.reading}</span>}
                    </div>
                    <div className="row-sub">{w.meaning}</div>
                  </div>
                  {status !== "new" && (
                    <span className={`status ${status}`}>
                      {status === "mastered" && <CheckIcon size={12} />}
                      {status === "mastered" ? "Mastered" : "Learning"}
                    </span>
                  )}
                  <SpeakButton text={w.term} lang={lang.speechLang} variant="quiet" />
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </main>
  );
}
