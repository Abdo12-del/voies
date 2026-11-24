import { useEffect, useRef } from "react";
import "./HouseEntry.css";

/** A short illustrated bridge between the real city map and the lesson room. */
export function HouseEntry({ onSkip }: { onSkip: () => void }) {
  const skip = useRef<HTMLButtonElement>(null);
  useEffect(() => { skip.current?.focus(); }, []);
  return (
    <main className="house-entry" aria-label="الدخول إلى منزل العائلة">
      <h1 className="sr-only">الدخول إلى منزل العائلة</h1>
      <div className="house-entry-frame house-entry-approach" aria-hidden="true" />
      <div className="house-entry-frame house-entry-door" aria-hidden="true" />
      <div className="house-entry-frame house-entry-inside" aria-hidden="true" />
      <p className="house-entry-status" role="status">هيا ندخل منزل العائلة...</p>
      <button ref={skip} type="button" className="house-entry-skip" onClick={onSkip}>تخطّي الانتقال <span aria-hidden="true">←</span></button>
    </main>
  );
}
