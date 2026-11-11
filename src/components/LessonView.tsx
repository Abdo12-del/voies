import { useEffect } from "react";
import { getLevel, getSession } from "../data/sessions";
import { Character } from "./Character";
import { ArrowBackIcon, CheckIcon } from "./icons";

interface Props {
  id: number;
  mode: "learn" | "review";
  onBack: () => void;
}

/**
 * شاشة الحصة — تظهر عند فتح المحطة.
 * الخارطة للتنقل والتقدّم فقط؛ أما محتوى كل حصة فيُعرض هنا.
 * (ضع أنشطة الحصة الفعلية داخل قسم "lesson-content" أدناه.)
 */
export function LessonView({ id, mode, onBack }: Props) {
  const s = getSession(id)!;
  const level = getLevel(s.level);
  const review = mode === "review";

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [id]);

  return (
    <main className={`lesson level-${s.level}`}>
      <div className="lesson-top">
        <button type="button" className="btn btn-ghost btn-sm" onClick={onBack}>
          <ArrowBackIcon size={18} /> العودة إلى الخارطة
        </button>
        <span className={`lesson-mode ${review ? "is-review" : ""}`}>{review ? "↺ وضع المراجعة" : "✨ حصة اليوم"}</span>
      </div>

      <section className="lesson-hero">
        <div className="lesson-hero-text">
          <span className="lesson-kicker">
            {level.shortName} · {level.name}
          </span>
          <span className="lesson-num">الحصة {s.id} من 32</span>
          <h1 className="lesson-title">
            <span className="lesson-icon" aria-hidden="true">
              {s.icon}
            </span>
            {s.title}
          </h1>
          <p className="lesson-goal">
            <b>ماذا سأتعلم؟</b> {s.desc}
          </p>
        </div>
        <div className="lesson-hero-char">
          <div className="speech speech--laila">{review ? "لنتذكّر معًا ما تعلمناه!" : "أنا معك في هذه المحطة!"}</div>
          <Character who="laila" height={170} />
        </div>
      </section>

      <section className="lesson-steps" aria-label="مراحل الحصة">
        {[
          { icon: "🧘", t: "نستعد", d: "نتنفّس بهدوء ونتعرّف على هدف المحطة." },
          { icon: "🎯", t: "نتدرّب", d: "نمارس المهارة بنشاط ممتع خطوة بخطوة." },
          { icon: "🎤", t: "نؤدّي", d: "نقدّم أداءً قصيرًا ونحتفل بما أنجزناه." },
        ].map((st, i) => (
          <div key={st.t} className="lesson-step">
            <span className="lesson-step-num">{i + 1}</span>
            <span className="lesson-step-icon" aria-hidden="true">
              {st.icon}
            </span>
            <b>{st.t}</b>
            <span>{st.d}</span>
          </div>
        ))}
      </section>

      <section className="lesson-content" aria-label="محتوى الحصة">
        <h2>محتوى الحصة</h2>
        <p>تظهر هنا أنشطة الحصة {s.id} «{s.title}» كما يقدّمها المدرّب.</p>
      </section>

      <footer className="lesson-foot">
        {review ? (
          <p className="lesson-note is-done">
            <CheckIcon size={18} /> أتممتَ هذه الحصة من قبل — يمكنك مراجعتها متى شئت.
          </p>
        ) : (
          <p className="lesson-note">
            🔓 عندما تنتهي من الحصة، سيعتمد مدرّبك إكمالها، فتُفتح محطتك التالية على الخارطة.
          </p>
        )}
        <button type="button" className="btn btn-primary" onClick={onBack}>
          العودة إلى الخارطة
        </button>
      </footer>
    </main>
  );
}
