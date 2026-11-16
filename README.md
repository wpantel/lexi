# Lexi

Learn the 1,000 most useful words of a language with spaced repetition. Korean is the first course. Next.js, no backend; progress is saved in the browser.

```bash
npm run dev
```

Then open http://localhost:3000.

## How it teaches

- **Small daily batches** of new words (10 by default), most essential first.
- **Immediate retrieval**: each lesson introduces a few words, then quizzes them in both directions, then once more at the end.
- **Spaced repetition** (SM-2 style): each word comes back just before you would forget it, at growing intervals. A word is "mastered" once its interval reaches three weeks.
- **Both directions**: once a word has stuck, reviews alternate between recognising it and producing it from the meaning.
- **Audio** through the browser's built-in Korean voice.
- **Practice** quizzes (meaning, recall, listening) that don't affect the schedule.

## The word list

`data/ko.source.txt` is the source of truth: 20 themed units, one `korean|english|part of speech` line per word. It is a hand-curated list of high-frequency everyday vocabulary, not an official frequency ranking.

```bash
npm run words
```

rebuilds `src/data/ko.json`, removing duplicates, trimming to 1,000 words and generating the pronunciation guide (Revised Romanization with the common sound-change rules).

## Adding a language

1. Write `data/<code>.source.txt` in the same format.
2. Add a `build("<code>")` call in `scripts/build-words.mjs` (the romanizer is Korean-specific; supply readings another way for other scripts).
3. Register it in `src/lib/language.ts`.

Progress is stored per language code, so languages don't interfere with each other.

## Layout

- `src/lib/srs.ts` scheduling, `src/lib/store.ts` saved progress and stats, `src/lib/quiz.ts` answer options, `src/lib/speech.ts` audio
- `src/app` screens: Today (`/`), `/learn`, `/review`, `/practice/*`, `/words`, `/settings`
- `src/app/globals.css` design tokens and all styles (light and dark follow the system)
