import { describe, expect, it } from "vitest";
import { SESSIONS, getSession, type Session } from "../src/data/sessions";
import {
  buildSlides,
  chunkSteps,
  SECTION_META,
  SLIDE_STEP_BUDGET,
  SLIDE_TEXT_BUDGET,
  splitIntoSteps,
  type LessonSlide,
} from "../src/lib/lessonSlides";

/** كلمات النص بلا علامات ترقيم، للتأكد أن التقسيم لم يسقط أي كلمة أصلية. */
const words = (text: string) =>
  text
    .replace(/[.،,؛:؟!«»—…]/gu, " ")
    .split(/\s+/)
    .filter(Boolean);

const sectionSlides = (slides: LessonSlide[], kind: "activity" | "challenge") =>
  slides.filter(
    (
      slide,
    ): slide is Extract<LessonSlide, { kind: "activity" | "challenge" }> =>
      slide.kind === kind,
  );

describe("تقسيم الحصص إلى شرائح العرض", () => {
  it("يبني لكل حصة تسلسلًا يبدأ بالعنوان والهدف وينتهي بشريحة النهاية", () => {
    for (const session of SESSIONS) {
      const slides = buildSlides(session);
      expect(slides[0].kind).toBe("title");
      expect(slides.at(-1)!.kind).toBe("end");
      expect(slides.map((s) => s.kind).indexOf("end")).toBe(
        slides.length - 1,
        "لا شرائح بعد النهاية",
      );
      const kinds = slides.map((s) => s.kind);
      expect(kinds.indexOf("challenge")).toBeGreaterThan(
        kinds.indexOf("activity"),
        "النشاط يسبق التحدي",
      );
    }
  });

  it("يحافظ على كل كلمات النشاط والتحدي وترتيبها عبر الشرائح — لا حذف ولا قصّ", () => {
    for (const session of SESSIONS) {
      const slides = buildSlides(session);
      for (const kind of ["activity", "challenge"] as const) {
        const onSlides = sectionSlides(slides, kind).flatMap((slide) =>
          slide.steps.map((step) => step.text),
        );
        expect(onSlides.length, `الحصة ${session.id} ${kind}`).toBeGreaterThan(
          0,
        );
        expect(onSlides.flatMap(words)).toEqual(words(session[kind]));
      }
    }
  });

  it("يُبقي محتوى الحصص الحالية في شريحة واحدة لكل قسم بخط كبير مريح", () => {
    for (const session of SESSIONS) {
      const slides = buildSlides(session);
      // كل الحصص الـ32 الحالية: غلاف، هدفي اليوم، نشاط، تحدٍ، نهاية = خمس شرائح
      expect(slides.map((s) => s.kind)).toEqual([
        "title",
        "goal",
        "activity",
        "challenge",
        "end",
      ]);
      for (const section of sectionSlides(slides, "activity"))
        expect(section.steps.length).toBeLessThanOrEqual(2);
    }
  });

  it("يقسّم النشاط إلى خطوات عند حدود الجمل ويبقي كلمة «ثم» في خطوتها", () => {
    const steps = splitIntoSteps(getSession(1)!.activity);
    expect(steps).toEqual([
      "اصنع بطاقة تعارف عليها اسمك ورسم لشيء تحبه.",
      "ثم قدّمها لصديق جديد وتعرّف إلى بطاقته.",
    ]);
    // «أولًا، ثم، أخيرًا» داخل علامتي الاقتباس لا يُقسّم لأنه ليس فاصل جملة
    const session5 = splitIntoSteps(getSession(5)!.activity);
    expect(session5).toHaveLength(2);
    expect(session5[1]).toContain("«أولًا، ثم، أخيرًا»");
  });

  it("يوزّع المحتوى الطويل على شرائح إضافية مرقّمة بدل القصّ أو تصغير الخط", () => {
    const sentence = "نمارس مهارة الوقوف بثقة أمام الصف مع صوت واضح";
    const long: Session = {
      ...getSession(9)!,
      activity: Array.from({ length: 8 }, (_, i) => `${sentence} ${i + 1}`)
        .join(". ")
        .concat("."),
    };
    const slides = buildSlides(long);
    const activity = sectionSlides(slides, "activity");
    expect(activity.length).toBeGreaterThan(1);
    activity.forEach((slide, i) => {
      expect(slide.part).toBe(i + 1);
      expect(slide.parts).toBe(activity.length);
      expect(slide.steps.length).toBeLessThanOrEqual(SLIDE_STEP_BUDGET);
      const charsInSlide = slide.steps.reduce(
        (total, step) => total + Array.from(step.text).length,
        0,
      );
      if (slide.steps.length > 1)
        expect(charsInSlide).toBeLessThanOrEqual(SLIDE_TEXT_BUDGET);
    });
    // الترقيم متواصل عبر الشرائح ١..٨، ولا حرف ضائع
    expect(activity.flatMap((s) => s.steps.map((step) => step.number))).toEqual(
      [1, 2, 3, 4, 5, 6, 7, 8],
    );
    expect(
      activity.flatMap((s) => s.steps.flatMap((step) => words(step.text))),
    ).toEqual(words(long.activity));
  });

  it("لا يولّد شريحة فارغة أبدًا", () => {
    expect(chunkSteps([])).toEqual([]);
    expect(splitIntoSteps("")).toEqual([]);
    expect(splitIntoSteps("  ")).toEqual([]);
  });

  it("يحفظ عناوين الأقسام الأصلية وأيقوناتها", () => {
    expect(SECTION_META.activity.label).toBe("نجرّب معًا");
    expect(SECTION_META.challenge.label).toBe("تحدّي المحطة");
  });
});
