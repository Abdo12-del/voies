import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { SESSIONS, getSession, type Session } from "../src/data/sessions";
import {
  FIRST_LESSON_PHASES,
  FIRST_LESSON_PURPOSES,
  FIRST_LESSON_SLIDES,
  FIRST_LESSON_TOTAL_MINUTES,
} from "../src/data/firstLesson";
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
  it("يبني لكل حصة تسلسلًا يبدأ بالعنوان وينتهي بشريحة النهاية", () => {
    for (const session of SESSIONS) {
      const slides = buildSlides(session);
      expect(slides[0].kind).toBe("title");
      expect(slides.at(-1)!.kind).toBe("end");
      expect(slides.map((s) => s.kind).indexOf("end")).toBe(
        slides.length - 1,
        "لا شرائح بعد النهاية",
      );
      if (session.id !== 1) {
        const kinds = slides.map((s) => s.kind);
        expect(kinds.indexOf("challenge")).toBeGreaterThan(
          kinds.indexOf("activity"),
          "النشاط يسبق التحدي",
        );
      }
    }
  });

  it("يبني للحصة الأولى عرضًا من 18 شريحة مطابقًا للمراحل الست وتوقيتها", () => {
    const slides = buildSlides(getSession(1)!);
    expect(slides).toHaveLength(18);
    expect(FIRST_LESSON_SLIDES).toHaveLength(16);
    expect(Object.keys(FIRST_LESSON_PURPOSES)).toHaveLength(18);
    expect(slides.map((slide) => slide.id)).toEqual(
      Object.keys(FIRST_LESSON_PURPOSES),
    );
    expect(slides.every((slide) => Boolean(slide.purpose))).toBe(true);
    expect(FIRST_LESSON_PHASES.map(({ title, minutes }) => [title, minutes])).toEqual([
      ["الاستقبال والتهيئة", 10],
      ["اكتشاف معنى التعريف بالنفس", 15],
      ["نتعلم بناء التعريف", 20],
      ["نتدرب قبل التقديم", 15],
      ["مساحة التطبيق", 20],
      ["التقويم والختام", 10],
    ]);
    expect(FIRST_LESSON_TOTAL_MINUTES).toBe(90);
    expect(
      slides.map((slide) =>
        slide.kind === "title"
          ? getSession(1)!.title
          : slide.kind === "guided"
            ? slide.title
            : slide.kind === "end"
              ? slide.headline
              : slide.kind,
      ),
    ).toEqual([
      "أهلًا بي في مساحة الكلام",
      "مساحة الكلام — ما الذي سنفعله اليوم؟",
      "هل نعرف بعضنا حقًا؟",
      "ما معنى أن أعرّف بنفسي؟",
      "ما المعلومات التي يمكن أن أشاركها عن نفسي؟",
      "هل أقول كل شيء عن نفسي؟ وما الذي أختاره؟",
      "الخطوة الأولى — اسمي",
      "الخطوة الثانية — عمري ومعلومات بسيطة عني",
      "الخطوة الثالثة — الأشياء التي أحبها واهتماماتي",
      "كيف أجمع هذه المعلومات في تعريف مترابط؟",
      "نموذج كامل لتقديم النفس",
      "بطاقة أفكاري — أجهز تعريفي بكلمات مفتاحية",
      "أرتب ما سأقوله وأتدرب عليه",
      "تجربة تدريبية مع الشخصيات الثلاث",
      "الآن حان دورك — أقدّم نفسي",
      "أستمع إلى زميلي وأتعرف عليه",
      "ماذا أصبحت أستطيع أن أفعل؟",
      "إنجازي الأول",
    ]);
    expect(
      slides.map((slide) =>
        slide.kind === "guided"
          ? slide.phase.number
          : slide.kind === "title" || slide.kind === "end"
            ? (slide.phase?.number ?? 0)
            : 0,
      ),
    ).toEqual([1, 1, 1, 2, 2, 2, 3, 3, 3, 3, 3, 4, 4, 4, 5, 5, 6, 6]);

    const privacy = slides.find(
      (slide) => slide.kind === "guided" && slide.id === "safe-sharing",
    ) as Extract<LessonSlide, { kind: "guided" }>;
    expect(privacy.cards?.map((card) => card.text).join(" ")).toContain(
      "رقم الهاتف",
    );
    expect(privacy.cards?.map((card) => card.text).join(" ")).toContain(
      "كلمة المرور",
    );
    const trio = slides.find(
      (slide) => slide.kind === "guided" && slide.id === "three-characters",
    ) as Extract<LessonSlide, { kind: "guided" }>;
    expect(trio.cards?.map((card) => card.character)).toEqual([
      "lailaWave",
      "samiExplain",
      "sisterIdea",
    ]);
    expect(trio.cards?.every((card) => Boolean(card.pose))).toBe(true);
    expect(trio.cards?.map((card) => card.artwork)).toEqual([
      "/lesson-art/slide-14-trio-laila.webp",
      "/lesson-art/slide-14-trio-sami.webp",
      "/lesson-art/slide-14-trio-sister.webp",
    ]);

    for (const slide of slides) {
      if (slide.kind === "guided" && slide.id === "three-characters") {
        expect(slide.cards?.every((card) => Boolean(card.artwork))).toBe(true);
        continue;
      }
      if (!("illustration" in slide && slide.illustration))
        throw new Error(`الشريحة ${slide.id} تحتاج صورة ووضعية مخصصة`);
      expect(slide.illustration.artwork, slide.id).toBeTruthy();
      expect(slide.illustration.characters.length).toBeGreaterThan(0);
      expect(slide.illustration.pose.length).toBeGreaterThan(0);
      expect(slide.illustration.speech).toBeTruthy();
    }
    const cover = slides[0];
    expect(cover.kind === "title" ? cover.illustration?.characters : []).toEqual([
      "lailaWave",
    ]);
    expect(cover.kind === "title" ? cover.illustration?.artwork : undefined).toBe(
      "/lesson-art/slide-01-cover-laila.webp",
    );
    const ending = slides.at(-1)!;
    expect(ending).toMatchObject({
      kind: "end",
      headline: "إنجازي الأول",
      nextLesson: "في الحصة القادمة: نتدرّب على أن يصل صوتنا واضحًا إلى الجميع.",
    });
    expect(
      ending.kind === "end" ? ending.illustration?.characters : [],
    ).toEqual(["samiSuccess", "sisterCheer"]);
    expect(
      ending.kind === "end" ? ending.illustration?.artwork : undefined,
    ).toBe("/lesson-art/slide-18-closing-duo.webp");
  });

  it("يوصل رسمة شفافة مخصصة لكل موضع ويحفظها WebP خفيفة", () => {
    const slides = buildSlides(getSession(1)!);
    const artwork = [
      ...slides.flatMap((slide) =>
        "illustration" in slide && slide.illustration?.artwork
          ? [slide.illustration.artwork]
          : [],
      ),
      ...slides.flatMap((slide) =>
        slide.kind === "guided"
          ? (slide.cards?.flatMap((card) =>
              card.artwork ? [card.artwork] : [],
            ) ?? [])
          : [],
      ),
    ];

    expect(artwork).toHaveLength(20);
    for (const src of artwork) {
      expect(src).toMatch(/^\/lesson-art\/[\w-]+\.webp$/u);
      const bytes = readFileSync(new URL(`../public${src}`, import.meta.url));
      expect(bytes.subarray(0, 4).toString("ascii")).toBe("RIFF");
      expect(bytes.subarray(8, 12).toString("ascii")).toBe("WEBP");
      expect(bytes.subarray(12, 16).toString("ascii")).toBe("VP8X");
      expect(bytes[20] & 0x10, `${src} includes transparency`).not.toBe(0);
      expect(bytes.length, `${src} stays optimized`).toBeLessThan(80_000);
    }
  });

  it("يحافظ على كل كلمات النشاط والتحدي وترتيبها عبر الشرائح — لا حذف ولا قصّ", () => {
    for (const session of SESSIONS.filter((item) => item.id !== 1)) {
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

  it("يُبقي الحصص العادية في شريحة واحدة لكل قسم بخط كبير مريح", () => {
    for (const session of SESSIONS.filter((item) => item.id !== 1)) {
      const slides = buildSlides(session);
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
    const steps = splitIntoSteps(
      "اصنع بطاقة تعارف عليها اسمك ورسم لشيء تحبه، ثم قدّمها لصديق جديد وتعرّف إلى بطاقته.",
    );
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
