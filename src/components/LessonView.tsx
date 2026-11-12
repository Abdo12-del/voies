import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type Ref,
} from "react";
import { getLevel, getSession } from "../data/sessions";
import { castFor, titleSpeech } from "../lib/lessonCast";
import {
  buildSlides,
  SECTION_META,
  type LessonSlide,
} from "../lib/lessonSlides";
import { Character, type CharacterKey } from "./Character";
import { Icon } from "./icons";

interface Props {
  id: number;
  mode: "learn" | "review";
  onBack: () => void;
  onPickSpeaker: () => void;
  onComplete: () => void;
}

/** مدة الانتقال بين الشرائح — مطابقة لـ --slide-duration في CSS. */
const SLIDE_DURATION = 450;

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

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/** ترتيب الظهور المتدرّج: العنوان ← الأيقونة ← النص ← الشخصية. */
const step = (i: number) => ({ "--i": i }) as CSSProperties;

function SlideFigure({
  cast,
  speech,
  named,
  className = "",
}: {
  cast: CharacterKey[];
  speech?: string;
  named?: boolean;
  className?: string;
}) {
  return (
    <div className={`slide-figure reveal ${className}`} style={step(3)}>
      {speech && <p className="slide-speech">{speech}</p>}
      <div className="figure-stage">
        {cast.map((who, n) => (
          <span
            key={who}
            className="figure-bob"
            style={{ "--n": n } as CSSProperties}
          >
            <span className="figure-pop">
              <Character who={who} height={340} decorative={!named} />
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}

/** نثار الاحتفال: قطع ورقية تنطلق مرة واحدة وتهبط ببطء — بلا وميض. */
function Confetti() {
  const colors = ["#ffc93c", "#1767b8", "#2fa36b", "#e85d75", "#8f6bd8"];
  return (
    <div className="end-confetti" aria-hidden="true">
      {Array.from({ length: 22 }, (_, n) => {
        const angle = (n / 22) * Math.PI * 2;
        const reach = 150 + ((n * 37) % 110);
        return (
          <i
            key={n}
            style={
              {
                "--x": `${Math.round(Math.cos(angle) * reach)}px`,
                "--y": `${Math.round(Math.sin(angle) * reach * 0.62 - 30)}px`,
                "--r": `${(n * 53) % 360}deg`,
                "--d": `${(n % 5) * 40}ms`,
                background: colors[n % colors.length],
              } as CSSProperties
            }
          />
        );
      })}
    </div>
  );
}

/**
 * الحصة عرض تقديمي: شريحة واحدة تملأ المساحة المرئية، بلا تمرير رأسي.
 * التنقّل بزرّي التالي/السابق، وبأسهم لوحة المفاتيح (اليسار = التالي باتجاه RTL)،
 * وبالسحب الأفقي على الشاشات اللمسية، وبشريط التقدّم المقسّم.
 * الانتقال انزلاقي باتجاه العربية: التالية تدخل من اليسار والحالية تخرج يمينًا.
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
  /** الشريحة المغادرة تبقى لحظة الانتقال فقط (ولا تُرسم مع تقليل الحركة). */
  const [leaving, setLeaving] = useState<{
    slide: LessonSlide;
    direction: 1 | -1;
    stamp: number;
  } | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const gesture = useRef<{ x: number; y: number } | null>(null);

  const goTo = useCallback(
    (target: number) => {
      const next = Math.max(0, Math.min(slides.length - 1, target));
      if (next === index) return;
      const dir = next > index ? 1 : -1;
      setDirection(dir);
      setLeaving(
        prefersReducedMotion()
          ? null
          : { slide: slides[index], direction: dir, stamp: Date.now() },
      );
      setIndex(next);
    },
    [index, slides],
  );

  useEffect(() => {
    if (!leaving) return;
    const timer = setTimeout(() => setLeaving(null), SLIDE_DURATION + 40);
    return () => clearTimeout(timer);
  }, [leaving]);

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

  const cast = (s: LessonSlide) =>
    castFor(s.kind, { sessionId: session.id, review });

  /** محتوى الشريحة. `live = false` للنسخة المغادرة: بلا مرجع تركيز ولا أزرار فعّالة. */
  const renderSlide = (s: LessonSlide, live: boolean): ReactNode => {
    const headingRef: Ref<HTMLHeadingElement> | undefined = live
      ? heading
      : undefined;
    const focusable = live ? -1 : undefined;
    const runningHead = (
      <p className="slide-running-head">
        <bdi>الحصة {session.id}</bdi>
        <span aria-hidden="true">·</span>
        {session.title}
      </p>
    );
    switch (s.kind) {
      case "title":
        return (
          <div className="slide-layout">
            <div className="slide-main lesson-hero">
              <p className="slide-meta reveal" style={step(0)}>
                <span className="eyebrow">
                  {level.shortName} · {level.name}
                </span>
                <span className="lesson-number">
                  <bdi>الحصة {session.id} من 32</bdi>
                </span>
              </p>
              <div className="slide-title-row">
                <span className="slide-hero-icon reveal" style={step(1)}>
                  <Icon name={session.icon} size={34} />
                </span>
                <h1
                  ref={headingRef}
                  tabIndex={focusable}
                  className="reveal"
                  style={step(0)}
                >
                  {session.title}
                </h1>
              </div>
              <p className="slide-lead reveal" style={step(2)}>
                {session.desc}
              </p>
              <div className="slide-goal reveal" style={step(2.6)}>
                <h2>
                  <Icon name="target" size={24} /> هدفي اليوم
                </h2>
                <p>{session.goal}</p>
              </div>
            </div>
            <SlideFigure
              cast={cast(s)}
              speech={titleSpeech(review)}
              named={live}
              className="figure-title"
            />
          </div>
        );
      case "activity":
      case "challenge": {
        const meta = SECTION_META[s.kind];
        return (
          <>
            {runningHead}
            <div className="slide-layout">
              <div className="slide-main">
                <div className="slide-head">
                  <span
                    className={`slide-emblem reveal ${
                      s.kind === "activity" ? "emblem-blue" : "emblem-gold"
                    }`}
                    style={step(1)}
                  >
                    <Icon name={meta.icon} size={34} />
                  </span>
                  <h2
                    ref={headingRef}
                    tabIndex={focusable}
                    className="slide-heading reveal"
                    style={step(0)}
                  >
                    {meta.label}
                    {s.parts > 1 && (
                      <span className="slide-part">
                        <bdi>
                          {s.part} من {s.parts}
                        </bdi>
                      </span>
                    )}
                  </h2>
                </div>
                {s.steps.length === 1 ? (
                  <p className="slide-body reveal" style={step(2)}>
                    {s.steps[0].text}
                  </p>
                ) : (
                  <ol className="slide-steps">
                    {s.steps.map((item, n) => (
                      <li
                        key={item.number}
                        className="lesson-step reveal"
                        style={step(2 + n * 0.5)}
                      >
                        <span className="lesson-step-number">
                          {item.number}
                        </span>
                        <p>{item.text}</p>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
              <SlideFigure cast={cast(s)} className={`figure-${s.kind}`} />
            </div>
          </>
        );
      }
      case "end":
        return (
          <div
            className={`slide-end-layout ${review ? "is-quiet" : "is-celebrating"}`}
          >
            {!review && <Confetti />}
            <div className="end-stage">
              <span className="end-glow" aria-hidden="true" />
              <SlideFigure cast={cast(s)} className="figure-end" />
              <span className="end-medal" aria-hidden="true">
                <Icon name={review ? "check" : "star"} size={30} />
              </span>
            </div>
            <h2
              ref={headingRef}
              tabIndex={focusable}
              className="slide-heading reveal"
              style={step(0)}
            >
              نهاية الحصة
              {!review && <span className="end-cheer">أحسنتم!</span>}
            </h2>
            <div className="lesson-approval-note reveal" style={step(2)}>
              <Icon name={review ? "check" : "book"} size={22} />
              <p>
                {review
                  ? "درسنا هذه الحصة من قبل. المراجعة لا تغيّر تقدّم الرحلة."
                  : "بعد إنهاء أنشطة الحصة مع الصف، اضغط «إنهاء الحصة» للانتقال إلى الخطوة التالية."}
              </p>
            </div>
            <div
              className="row-actions slide-end-actions reveal"
              style={step(4)}
            >
              {!review && (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={live ? onComplete : undefined}
                  tabIndex={live ? undefined : -1}
                >
                  <Icon name="check" size={20} /> إنهاء الحصة
                </button>
              )}
              <button
                type="button"
                className={`btn ${review ? "btn-primary" : "btn-ghost"}`}
                onClick={live ? onBack : undefined}
                tabIndex={live ? undefined : -1}
              >
                العودة إلى رحلتي
                <Icon name="chevron-left" size={19} />
              </button>
            </div>
          </div>
        );
    }
  };

  const slide = slides[index];
  const name = slideName(slide, session.title);

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
        {leaving && (
          <div
            key={`leave-${leaving.slide.id}-${leaving.stamp}`}
            className={`slide-frame slide-${leaving.slide.kind} is-leaving leave-${
              leaving.direction === 1 ? "next" : "prev"
            }`}
            aria-hidden="true"
            ref={(el) => el?.setAttribute("inert", "")}
          >
            {renderSlide(leaving.slide, false)}
          </div>
        )}
        <section
          key={slide.id}
          className={`slide slide-frame slide-${slide.kind} enter-${
            direction === 1 ? "next" : "prev"
          }`}
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
          {/* شريط تقدّم رفيع مقسّم: كل قطعة زرّ للانتقال المباشر إلى شريحتها */}
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
