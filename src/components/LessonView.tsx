import { useEffect, useRef } from "react";
import { getLevel, getSession } from "../data/sessions";
import { Character } from "./Character";
import { Icon } from "./icons";

interface Props {
  id: number;
  mode: "learn" | "review";
  onBack: () => void;
  onPickSpeaker: () => void;
  onComplete: () => void;
}

export function LessonView({
  id,
  mode,
  onBack,
  onPickSpeaker,
  onComplete,
}: Props) {
  const session = getSession(id)!,
    level = getLevel(session.level),
    review = mode === "review";
  const title = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    title.current?.focus({ preventScroll: true });
  }, [id]);
  return (
    <main className={`lesson level-${session.level}`}>
      <div className="lesson-inner">
        <div className="lesson-top">
          <button type="button" className="btn btn-ghost" onClick={onBack}>
            <Icon name="back" size={19} />
            العودة إلى الخارطة
          </button>
          <button
            type="button"
            className="btn btn-secondary lesson-wheel-button"
            onClick={onPickSpeaker}
          >
            <Icon name="wheel" size={20} /> مَن يتحدث؟
          </button>
          <span className="lesson-mode">
            <Icon name={review ? "review" : "leaf"} size={18} />
            {review ? "وضع المراجعة" : "خطوة جديدة في رحلتك"}
          </span>
        </div>
        <section className="lesson-hero">
          <div>
            <span className="eyebrow">
              {level.shortName} · {level.name}
            </span>
            <span className="lesson-number">
              <bdi>الحصة {session.id} من 32</bdi>
            </span>
            <span className="lesson-icon">
              <Icon name={session.icon} size={38} />
            </span>
            <h1 ref={title} tabIndex={-1}>
              {session.title}
            </h1>
            <p>{session.desc}</p>
          </div>
          <div className="lesson-character">
            <div className="speech">
              {review ? "لنتذكّر معًا ما تعلمناه" : "أنا معك في هذه الخطوة"}
            </div>
            <Character who="laila" height={200} decorative={false} />
          </div>
        </section>
        <section
          className="lesson-steps"
          aria-label="هدف الحصة ونشاطها وتحدّيها"
        >
          {(
            [
              { label: "هدفي اليوم", icon: "target", text: session.goal },
              { label: "نجرّب معًا", icon: "puzzle", text: session.activity },
              { label: "تحدّي المحطة", icon: "mic", text: session.challenge },
            ] as const
          ).map((step, i) => (
            <article className="lesson-step" key={step.label}>
              <span className="lesson-step-icon">
                <Icon name={step.icon} size={28} />
              </span>
              <span className="lesson-step-number">0{i + 1}</span>
              <h2>{step.label}</h2>
              <p>{step.text}</p>
            </article>
          ))}
        </section>
        <footer className="lesson-foot">
          <div className="lesson-approval-note">
            <Icon name={review ? "check" : "book"} size={22} />
            <p>
              {review
                ? "درسنا هذه الحصة من قبل. المراجعة لا تغيّر تقدّم الرحلة."
                : "بعد إنهاء أنشطة الحصة مع الصف، اضغط «إنهاء الحصة» للانتقال إلى الخطوة التالية."}
            </p>
          </div>
          <div className="row-actions">
            {!review && (
              <button
                type="button"
                className="btn btn-primary"
                onClick={onComplete}
              >
                <Icon name="check" size={20} /> إنهاء الحصة
              </button>
            )}
            <button
              type="button"
              className={`btn ${review ? "btn-primary" : "btn-ghost"}`}
              onClick={onBack}
            >
              العودة إلى رحلتي
              <Icon name="chevron-left" size={19} />
            </button>
          </div>
        </footer>
      </div>
    </main>
  );
}
