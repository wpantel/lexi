import { jamoOf } from "@/lib/hangul";

/**
 * A word set on manuscript paper (wongoji): one syllable block per square,
 * and a space takes a square of its own. With `breakdown`, the letters that
 * make up each block are listed under it.
 */
export function Cells({
  text,
  lang,
  size = "hero",
  breakdown = false,
}: {
  text: string;
  lang: string;
  size?: "hero" | "mini";
  breakdown?: boolean;
}) {
  const chars = [...text];
  return (
    <div className={`cells ${size}`} style={{ "--n": chars.length } as React.CSSProperties}>
      <span className="sr-only" lang={lang}>
        {text}
      </span>
      {chars.map((ch, i) => {
        const blank = ch.trim() === "";
        return (
          <div className="cell-col" key={i} aria-hidden="true">
            <div className={`cell ${blank ? "blank" : ""}`}>
              <span lang={lang}>{blank ? "" : ch}</span>
            </div>
            {breakdown && (
              <div className="jamo" lang={lang}>
                {jamoOf(ch).map((j, k) => (
                  <span key={k} className={j.kind}>
                    {j.char}
                  </span>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/** Explains the two colours used by the letter breakdown. */
export function JamoLegend() {
  return (
    <div className="jamo-legend">
      <span className="jamo">
        <span className="consonant" aria-hidden="true">
          ㄱ
        </span>
      </span>
      consonant
      <span className="jamo">
        <span className="vowel" aria-hidden="true">
          ㅏ
        </span>
      </span>
      vowel
    </div>
  );
}
