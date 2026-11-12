import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getLevel, getSession } from "../data/sessions";
import {
  buildSlides,
  SECTION_META,
  type LessonSlide,
} from "../lib/lessonSlides";
import { Character } from "./Character";
import { Icon } from "./icons";

interface Props {
  id: number;
  mode: "learn" | "review";
  onBack: () => void;
  onPickSpeaker: () => void;
  onComplete: () => void;
}

function slideName(slide: LessonSlide, sessionTitle: string): string {
  switch (slide.kind) {
    case "title":
      return sessionTitle;
    case "end":
      return "نهاية الحصة";
    default:
      return SECTION_META[slide.kind].label;
  }
}

/**
 * الحصة عرض تقديمي: شريحة واحدة تملأ المساحة المرئية، بلا تمرير رأسي.
 * التنقّل بزرّي التالي/السابق، وبأسهم لوحة المفاتيح (اليسار = التالي باتجاه RTL)،
 * وبالسحب الأفقي على الشاشات اللمسية، وبنقاط الوصول المباشر.
 * التجوّل بين الشرائح لا يُنهي الحصة أبدًا — زر «إنهاء الحصة» في شريحة النهاية فقط.
 */
export function LessonView({
  id,
  mode,
  onBack,
  onPickSpeaker,
  onComplete,
}: Props) {
  const session = getSession(id)!;
  const level = getLevel(session.level);
  const review = mode === "review";
  const slides = useMemo(() => buildSlides(session), [session]);
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const heading = useRef<HTMLHeadingElement>(null);
  const gesture = useRef<{ x: number; y: number } | null>(null);

  const goTo = useCallback(
    (target: number) => {
      setIndex((previous) => {
        const next = Math.max(0, Math.min(slides.length - 1, target));
        if (next !== previous) setDirection(next > previous ? 1 : -1);
        return next;
      });
    },
    [slides.length],
  );

  /* لوحة المفاتيح تراعي اتجاه العربية: اليسار للتقدّم واليمين للرجوع. */
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      // لا نختطف المفاتيح أثناء حوار مفتوح (العجلة أو غيرها) أو داخل حقول الإدخال.
      if (document.getElementById("root")?.hasAttribute("inert")) return;
      if (
        (event.target as HTMLElement | null)?.closest(
          "input, textarea, select, [contenteditable]",
        )
      )
        return;
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        goTo(index + 1);
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        goTo(index - 1);
      } else if (event.key === "Home") {
        event.preventDefault();
        goTo(0);
      } else if (event.key === "End") {
        event.preventDefault();
        goTo(slides.length - 1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, goTo, slides.length]);

  /* نقل التركيز إلى عنوان الشريحة يُسمع قارئ الشاشة فور وصولها. */
  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
  }, [index]);

  const endGesture = (x: number, y: number) => {
    const start = gesture.current;
    gesture.current = null;
    if (!start) return;
    const dx = x - start.x;
    const dy = y - start.y;
    /* سحب أفقي واضح فقط؛ RTL: السحب نحو اليسار يقدّم الشريحة. */
    if (Math.abs(dx) >= 48 && Math.abs(dx) > Math.abs(dy) * 1.2)
      goTo(index + (dx < 0 ? 1 : -1));
  };

  const slide = slides[index];
  const name = slideName(slide, session.title);
  const content = (() => {
    switch (slide.kind) {
      case "title":
        return (
          <>
            <div className="slide-title-grid">
              <div className="lesson-hero">
                <span className="eyebrow">
                  {level.shortName} · {level.name}
                </span>
                <span className="lesson-number">
                  <bdi>الحصة {session.id} من 32</bdi>
                </span>
                <span className="slide-hero-icon">
                  <Icon name={session.icon} size={36} />
                </span>
                <h1 ref={heading} tabIndex={-1}>
                  {session.title}
                </h1>
                <p>{session.desc}</p>
              </div>
              <div className="slide-character">
                <p className="slide-speech">
                  {review ? "لنتذكّر معًا ما تعلمناه" : "أنا معك في هذه الخطوة"}
                </p>
                <Character who="laila" height={190} decorative={false} />
              </div>
            </div>
            <div className="slide-goal">
              <h2>
                <Icon name="target" size={24} /> هدفي اليوم
              </h2>
              <p>{session.goal}</p>
            </div>
          </>
        );
      case "activity":
      case "challenge": {
        const meta = SECTION_META[slide.kind];
        return (
          <>
            <span
              className={`slide-emblem ${
                slide.kind === "activity" ? "emblem-blue" : "emblem-gold"
              }`}
            >
              <Icon name={meta.icon} size={38} />
            </span>
            <h2 ref={heading} tabIndex={-1}>
              {meta.label}
              {slide.parts > 1 && (
                <span className="slide-part">
                  <bdi>
                    {slide.part} من {slide.parts}
                  </bdi>
                </span>
              )}
            </h2>
            {slide.steps.length === 1 ? (
              <p className="slide-body">{slide.steps[0].text}</p>
            ) : (
              <ol className="slide-steps">
                {slide.steps.map((step) => (
                  <li key={step.number} className="lesson-step">
                    <span className="lesson-step-number">{step.number}</span>
                    <p>{step.text}</p>
                  </li>
                ))}
              </ol>
            )}
          </>
        );
      }
      case "end":
        return (
          <>
            <span className="slide-end-character">
              <Character who="samiCheer" height={150} />
            </span>
            <h2 ref={heading} tabIndex={-1}>
              نهاية الحصة
            </h2>
            <div className="lesson-approval-note">
              <Icon name={review ? "check" : "book"} size={22} />
              <p>
                {review
                  ? "درسنا هذه الحصة من قبل. المراجعة لا تغيّر تقدّم الرحلة."
                  : "بعد إنهاء أنشطة الحصة مع الصف، اضغط «إنهاء الحصة» للانتقال إلى الخطوة التالية."}
              </p>
            </div>
            <div className="row-actions slide-end-actions">
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
          </>
        );
    }
  })();

  return (
    <main
      className={`lesson level-${session.level}`}
      aria-label={`الحصة ${session.id}: ${session.title}`}
    >
      {/* أدوات عائمة خفيفة — بلا شريط علوي أو سفلي ممتدّ */}
      <div className="lesson-float lesson-float-start">
        <button
          type="button"
          className="lesson-chip"
          onClick={onBack}
          aria-label="العودة إلى رحلتي"
          title="العودة إلى الخارطة"
        >
          <Icon name="back" size={18} />
          <span aria-hidden="true">رحلتي</span>
        </button>
      </div>
      {review && (
        <p className="lesson-float lesson-float-mode">
          <Icon name="review" size={15} /> وضع المراجعة
        </p>
      )}
      <div className="lesson-float lesson-float-end">
        <button
          type="button"
          className="lesson-chip"
          onClick={onPickSpeaker}
          aria-label="مَن يتحدث؟"
          title="عجلة اختيار المتحدث"
        >
          <Icon name="wheel" size={19} />
          <span aria-hidden="true">مَن يتحدث؟</span>
        </button>
      </div>

      <div
        className="slide-stage"
        onTouchStart={(event) => {
          const touchPoint = event.changedTouches[0];
          gesture.current = { x: touchPoint.clientX, y: touchPoint.clientY };
        }}
        onTouchEnd={(event) => {
          const touchPoint = event.changedTouches[0];
          endGesture(touchPoint.clientX, touchPoint.clientY);
        }}
        onTouchCancel={() => {
          gesture.current = null;
        }}
      >
        <section
          key={slide.id}
          className={`slide slide-${slide.kind} enter-${
            direction === 1 ? "next" : "prev"
          }`}
          role="group"
          aria-roledescription="شريحة"
          aria-label={`الشريحة ${index + 1} من ${slides.length}: ${name}`}
        >
          {content}
        </section>
      </div>

      <nav className="slide-nav" aria-label="التنقّل بين شرائح الحصة">
        <button
          type="button"
          className="btn-nav btn-nav-prev"
          onClick={() => goTo(index - 1)}
          disabled={index === 0}
        >
          <Icon name="chevron-right" size={18} /> السابق
        </button>
        <div className="slide-status">
          <p className="slide-counter">
            <bdi>
              {index + 1} من {slides.length}
            </bdi>
          </p>
          <div className="slide-dots" role="group" aria-label="اختيار شريحة">
            {slides.map((s, dotIndex) => (
              <button
                key={s.id}
                type="button"
                className={`dot ${dotIndex === index ? "active" : ""}`}
                aria-label={`الشريحة ${dotIndex + 1}: ${slideName(s, session.title)}`}
                aria-current={dotIndex === index ? "true" : undefined}
                onClick={() => goTo(dotIndex)}
              />
            ))}
          </div>
        </div>
        <button
          type="button"
          className="btn-nav btn-nav-next"
          onClick={() => goTo(index + 1)}
          disabled={index === slides.length - 1}
        >
          التالي <Icon name="chevron-left" size={18} />
        </button>
      </nav>
      <p className="sr-only" role="status">
        {`الشريحة ${index + 1} من ${slides.length}: ${name}`}
      </p>
    </main>
  );
}
