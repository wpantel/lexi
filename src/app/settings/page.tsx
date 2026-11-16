"use client";

import { useRef } from "react";
import { currentLanguage as lang } from "@/lib/language";
import { useCanSpeak } from "@/lib/speech";
import { progressFor, resetProgress, setSettings, useAppState, useHydrated } from "@/lib/store";

const DAILY = [5, 10, 15, 20];

export default function SettingsPage() {
  const hydrated = useHydrated();
  const state = useAppState();
  const canSpeak = useCanSpeak(lang.speechLang);
  const dialog = useRef<HTMLDialogElement>(null);
  const { dailyNew, showReading, autoSpeak, showJamo } = state.settings;
  const learned = Object.keys(progressFor(state, lang.code).cards).length;

  return (
    <main className="page">
      <header className="page-head">
        <h1 className="title">Settings</h1>
      </header>

      <h2 className="section-title" style={{ marginTop: 8 }}>
        Learning
      </h2>
      <div className="card list">
        <div className="setting stack">
          <div>
            <div className="row-title" id="daily-label">
              New words per day
            </div>
            <div className="row-sub">Ten is a steady pace. Every new word adds reviews over the following weeks.</div>
          </div>
          <div className="segmented" role="radiogroup" aria-labelledby="daily-label">
            {DAILY.map((n) => (
              <button key={n} type="button" role="radio" aria-checked={dailyNew === n} onClick={() => setSettings({ dailyNew: n })}>
                {n}
              </button>
            ))}
          </div>
        </div>
        <label className="setting">
          <span>
            <span className="row-title" style={{ display: "block" }}>
              Show pronunciation guide
            </span>
            <span className="row-sub">Romanized spelling under each word. Turn it off once you can read Hangul.</span>
          </span>
          <input
            type="checkbox"
            role="switch"
            className="switch"
            checked={showReading}
            onChange={(e) => setSettings({ showReading: e.target.checked })}
          />
        </label>
        <label className="setting">
          <span>
            <span className="row-title" style={{ display: "block" }}>
              Show letter breakdown
            </span>
            <span className="row-sub">List the consonants and vowels inside each syllable block when you meet a word.</span>
          </span>
          <input
            type="checkbox"
            role="switch"
            className="switch"
            checked={showJamo}
            onChange={(e) => setSettings({ showJamo: e.target.checked })}
          />
        </label>
        <label className="setting">
          <span>
            <span className="row-title" style={{ display: "block" }}>
              Play audio automatically
            </span>
            <span className="row-sub">
              {hydrated && !canSpeak
                ? `This browser has no ${lang.name} voice installed, so audio is unavailable.`
                : "Hear each word when it appears. You can always tap the speaker."}
            </span>
          </span>
          <input
            type="checkbox"
            role="switch"
            className="switch"
            checked={autoSpeak}
            onChange={(e) => setSettings({ autoSpeak: e.target.checked })}
          />
        </label>
      </div>

      <h2 className="section-title">Progress</h2>
      <p className="section-note">Your progress is saved in this browser on this device.</p>
      <div className="card list">
        <button type="button" className="row btn-danger" style={{ width: "100%", fontWeight: 600 }} onClick={() => dialog.current?.showModal()}>
          Reset {lang.name} progress
        </button>
      </div>

      <dialog ref={dialog} className="sheet" aria-labelledby="reset-title">
        <h2 id="reset-title">Reset {lang.name} progress?</h2>
        <p>
          This erases your {learned} learned {learned === 1 ? "word" : "words"}, review schedule and streak. It can&apos;t be undone.
        </p>
        <button
          type="button"
          className="btn btn-danger btn-block"
          onClick={() => {
            resetProgress(lang.code);
            dialog.current?.close();
          }}
        >
          Reset progress
        </button>
        <button type="button" className="btn btn-block" onClick={() => dialog.current?.close()} autoFocus>
          Cancel
        </button>
      </dialog>
    </main>
  );
}
