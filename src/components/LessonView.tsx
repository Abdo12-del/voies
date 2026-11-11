import { useEffect, useRef } from "react";
import { getLevel, getSession } from "../data/sessions";
import { Character } from "./Character";
import { Icon } from "./icons";

interface Props {
  id: number;
  mode: "learn" | "review";
  onBack: () => void;
}

export function LessonView({ id, mode, onBack }: Props) {
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
            <Icon name={review ? "check" : "lock"} size={22} />
            <p>
              {review
                ? "اعتمد مدرّبك هذه الحصة من قبل. المراجعة لا تغيّر تقدّمك."
                : "بعد إتمام نشاطك، يعتمد المدرّب الحصة من حسابه. لا تُفتح المحطة التالية من هذه الشاشة."}
            </p>
          </div>
          <button type="button" className="btn btn-primary" onClick={onBack}>
            العودة إلى رحلتي
            <Icon name="chevron-left" size={19} />
          </button>
        </footer>
      </div>
    </main>
  );
}
