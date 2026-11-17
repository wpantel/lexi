"use client";

import { useDeferredValue, useState } from "react";
import { SearchIcon } from "@/components/Icons";
import { SpeakButton } from "@/components/SpeakButton";
import { POS_LABEL, currentLanguage as lang, type Word } from "@/lib/language";
import { formatInterval, statusOf, strengthOf, type Card, type Status } from "@/lib/srs";
import { progressFor, useAppState } from "@/lib/store";

type Filter = "all" | Status;
const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "new", label: "Not started" },
  { id: "learning", label: "Learning" },
  { id: "mastered", label: "Mastered" },
];

/** Memory strength as four squares that fill in, the same squares as the contents page. */
function Strength({ card }: { card: Card }) {
  const level = strengthOf(card);
  const mastered = statusOf(card) === "mastered";
  const label = mastered ? "Mastered" : "Learning";
  return (
    <span className={`strength ${mastered ? "mastered" : ""}`} title={`${label}. Review gap: ${formatInterval(card.interval)}`}>
      <span className="pips" aria-hidden="true">
        {[1, 2, 3, 4].map((n) => (
          <i key={n} className={n <= level ? "on" : ""} />
        ))}
      </span>
      <span className="strength-label">
        {label}
        <span className="sr-only">, strength {level} of 4</span>
      </span>
    </span>
  );
}

function matches(w: Word, q: string): boolean {
  return w.term.includes(q) || w.meaning.toLowerCase().includes(q) || w.reading.includes(q);
}

export default function WordsPage() {
  const state = useAppState();
  const cards = progressFor(state, lang.code).cards;
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const q = useDeferredValue(query).trim().toLowerCase();

  const totals: Record<Filter, number> = { all: lang.words.length, new: 0, learning: 0, mastered: 0 };
  for (const w of lang.words) totals[statusOf(cards[w.term])]++;

  const units = lang.units
    .map((u, i) => ({
      ...u,
      number: i + 1,
      known: u.words.filter((w) => cards[w.term]).length,
      shown: u.words.filter((w) => (filter === "all" || statusOf(cards[w.term]) === filter) && (!q || matches(w, q))),
    }))
    .filter((u) => u.shown.length > 0);
  const count = units.reduce((n, u) => n + u.shown.length, 0);

  return (
    <main className="page">
      <header className="masthead">
        <div>
          <p className="dateline">
            {lang.name} · {lang.words.length.toLocaleString()} words in {lang.units.length} units
          </p>
          <h1 className="title">Words</h1>
        </div>
      </header>

      <div className="filters">
        <label className="search">
          <SearchIcon />
          <span className="sr-only">Search words</span>
          <input
            type="search"
            placeholder={`Search ${lang.name} or English`}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <div className="options" role="group" aria-label="Filter by progress">
          {FILTERS.map((f) => (
            <button key={f.id} type="button" aria-pressed={filter === f.id} onClick={() => setFilter(f.id)}>
              {f.label}
              <small>{totals[f.id].toLocaleString()}</small>
            </button>
          ))}
        </div>
      </div>

      <p className="result-count" aria-live="polite">
        {q || filter !== "all" ? `${count.toLocaleString()} ${count === 1 ? "word" : "words"} found` : ""}
      </p>

      {units.length === 0 && (
        <div className="empty">
          <b>Nothing on this page</b>
          {q
            ? `No words match “${query.trim()}”. Try the English meaning or part of the ${lang.name} word.`
            : filter === "mastered"
              ? "No mastered words yet. A word is mastered once you remember it across a three-week gap."
              : "No words here yet. Start a lesson from Today."}
        </div>
      )}

      {units.map((u) => (
        <section key={u.id} id={u.id} className="unit-block">
          <div className="section-head unit-head">
            <h2>
              <span className="unit-no" aria-hidden="true">
                {String(u.number).padStart(2, "0")}
              </span>
              {u.title}
            </h2>
            <p>
              {u.description} · {u.known} of {u.words.length} learned
            </p>
          </div>
          <div className="gloss">
            {u.shown.map((w) => {
              const card = cards[w.term];
              return (
                <div className="entry" key={w.term}>
                  <div className="entry-term" lang={lang.code}>
                    {w.term}
                    {state.settings.showReading && (
                      <span className="entry-reading" lang="en">
                        {w.reading}
                      </span>
                    )}
                  </div>
                  <div className="entry-meaning">
                    {w.meaning} <i>{POS_LABEL[w.pos] ?? w.pos}</i>
                  </div>
                  {card ? <Strength card={card} /> : <span className="strength" />}
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
