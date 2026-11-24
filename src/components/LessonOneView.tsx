import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type Ref,
} from "react";
import { getSession } from "../data/sessions";
import {
  buildSlides,
  SECTION_META,
  type LessonSlide,
} from "../lib/lessonSlides";
import { Icon } from "./icons";
import { LessonOneSlide } from "./LessonOneCover";

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
    case "goal":
      return "هدفي اليوم";
    case "end":
      return "نهاية الحصة";
    default:
      return SECTION_META[slide.kind].label;
  }
}

/** العرض القصصي للحصة الأولى؛ بقية الحصص تحتفظ بعرضها المستقل. */
export function LessonOneView({
  id,
  mode,
  onBack,
  onPickSpeaker,
  onComplete,
}: Props) {
  const session = getSession(id)!;
  const review = mode === "review";
  const slides = useMemo(() => buildSlides(session), [session]);
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [leaving, setLeaving] = useState<LessonSlide | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const gesture = useRef<{ x: number; y: number } | null>(null);

  const goTo = useCallback(
    (target: number) => {
      const next = Math.max(0, Math.min(slides.length - 1, target));
      if (next === index) return;
      setDirection(next > index ? 1 : -1);
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      setLeaving(!reduced ? slides[index] : null);
      setIndex(next);
    },
    [index, slides],
  );

  useEffect(() => {
    if (!leaving) return;
    const timer = setTimeout(() => setLeaving(null), 510);
    return () => clearTimeout(timer);
  }, [leaving, index]);

  /* لوحة المفاتيح تراعي اتجاه العربية: اليسار للتقدّم واليمين للرجوع. */
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
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

  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
  }, [index]);

  const endGesture = (x: number, y: number) => {
    const start = gesture.current;
    gesture.current = null;
    if (!start) return;
    const dx = x - start.x;
    const dy = y - start.y;
    if (Math.abs(dx) >= 48 && Math.abs(dx) > Math.abs(dy) * 1.2)
      goTo(index + (dx < 0 ? 1 : -1));
  };

  const renderSlide = (s: LessonSlide, live: boolean): ReactNode => {
    const headingRef: Ref<HTMLHeadingElement> | undefined = live
      ? heading
      : undefined;
    return <LessonOneSlide session={session} slide={s} headingRef={headingRef} live={live} review={review} onNext={() => goTo(1)} onComplete={onComplete} />;
  };

  const slide = slides[index];
  const name = slideName(slide, session.title);

  return (
    <main
      className={`lesson level-${session.level} lesson-story-cover`}
      aria-label={`الحصة ${session.id}: ${session.title}`}
    >
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
        {leaving && (
          <section
            key={`leaving-${leaving.id}`}
            className={`slide slide-frame slide-${leaving.kind} is-story-exiting${direction < 0 ? " is-story-reverse" : ""}`}
            aria-hidden="true"
            ref={(element) => { if (element) element.inert = true; }}
          >
            {renderSlide(leaving, false)}
          </section>
        )}
        <section
          key={slide.id}
          className={`slide slide-frame slide-${slide.kind} is-story-entering${direction < 0 ? " is-story-reverse" : ""}`}
          role="group"
          aria-roledescription="شريحة"
          aria-label={`الشريحة ${index + 1} من ${slides.length}: ${name}`}
        >
          {renderSlide(slide, true)}
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
            <span className="slide-counter-label">شريحة</span>{" "}
            <bdi>
              {index + 1} من {slides.length}
            </bdi>
          </p>
          <div className="slide-dots" role="group" aria-label="اختيار شريحة">
            {slides.map((s, dotIndex) => (
              <button
                key={s.id}
                type="button"
                className={`dot ${dotIndex === index ? "active" : ""} ${
                  dotIndex < index ? "is-done" : ""
                }`}
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
