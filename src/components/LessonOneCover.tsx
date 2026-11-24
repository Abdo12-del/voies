import type { CSSProperties, Ref } from "react";
import type { Session } from "../data/sessions";
import type { LessonSlide } from "../lib/lessonSlides";
import "./LessonOneCover.css";

const scenes = {
  title: { background: "cover", figure: "laila-welcome", eyebrow: "الحصة الأولى · المتحدث الواثق" },
  goal: { background: "cover", figure: "goal-introduce", eyebrow: "لنكتشف هدفنا" },
  activity: { background: "goal", figure: "activity-listen", eyebrow: "نتحاور ونتعرّف" },
  challenge: { background: "challenge", figure: "challenge-sami", eyebrow: "صوتك له مكان" },
  end: { background: "end", figure: "end-sister", eyebrow: "خطوتنا الأولى" },
} as const;

/** Each first-lesson scene pairs the original lesson text with a purpose-made pose. */
export function LessonOneSlide({
  session, slide, headingRef, live, review, onNext, onComplete,
}: {
  session: Session;
  slide: LessonSlide;
  headingRef: Ref<HTMLHeadingElement> | undefined;
  live: boolean;
  review: boolean;
  onNext: () => void;
  onComplete: () => void;
}) {
  const scene = scenes[slide.kind];
  const title = slide.kind === "title" ? session.title
    : slide.kind === "goal" ? "هدفي اليوم"
    : slide.kind === "activity" ? "نجرّب معًا"
    : slide.kind === "challenge" ? "تحدّي المحطة" : "نهاية الحصة";
  const text = slide.kind === "title" ? session.desc
    : slide.kind === "goal" ? session.goal
    : slide.kind === "activity" || slide.kind === "challenge"
      ? slide.steps.map((step) => step.text).join(" ")
      : review ? "درسنا هذه الحصة من قبل. المراجعة لا تغيّر تقدّم الرحلة."
        : "أحسنتم! بعد إنهاء أنشطة الحصة مع الصف، اضغط «إنهاء الحصة» للانتقال إلى الخطوة التالية.";
  return (
    <div className={`lesson-one-cover lesson-one-${slide.kind}`} style={{ "--scene": `url('/lesson-one/bg-${scene.background}.webp')` } as CSSProperties}>
      <div className="lesson-one-light" aria-hidden="true" />
      <div className="lesson-one-figure" aria-hidden="true">
        <img src={`/lesson-one/${scene.figure}.webp`} alt="" />
      </div>
      <div className="lesson-one-words">
        <p className="lesson-one-eyebrow">✦ {scene.eyebrow}</p>
        <h2 ref={headingRef} tabIndex={live ? -1 : undefined} aria-label={title}>
          {title.split(" ").map((word, i) => (
            <span key={`${word}-${i}`} aria-hidden="true">
              {i > 0 && " "}<span className="lesson-one-word" style={{ "--word": i } as CSSProperties}>{word}</span>
            </span>
          ))}
        </h2>
        <p className="lesson-one-intro">{text}</p>
        {slide.kind === "title" && (
          <button className="lesson-one-start" type="button" onClick={onNext} tabIndex={live ? undefined : -1}>
            هيا نبدأ <span aria-hidden="true">←</span>
          </button>
        )}
        {slide.kind === "end" && !review && (
          <button className="lesson-one-start" type="button" onClick={onComplete} tabIndex={live ? undefined : -1}>
            إنهاء الحصة <span aria-hidden="true">✓</span>
          </button>
        )}
      </div>
    </div>
  );
}
