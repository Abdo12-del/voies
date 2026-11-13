import type { Session, SessionIconName } from "../data/sessions";
import type { CharacterKey } from "../components/Character";
import {
  FIRST_LESSON_CLOSING,
  FIRST_LESSON_PHASES,
  FIRST_LESSON_PURPOSES,
  FIRST_LESSON_SLIDES,
} from "../data/firstLesson";

/**
 * نموذج شرائح الحصة. التقسيم عرضي بحت: لا يُحذف ولا يُختصر أي نص أصلي —
 * المحتوى الطويل يُوزّع على شرائح إضافية بدل قصّه أو تصغير خطّه.
 */

/** أقصى عدد خطوات في شريحة واحدة قبل الانتقال إلى شريحة إضافية. */
export const SLIDE_STEP_BUDGET = 3;
/** أقصى مجموع أحرف في شريحة خطوات واحدة، حفاظًا على حجم خط مريح للقراءة أمام الصف. */
export const SLIDE_TEXT_BUDGET = 190;

export interface SlideStep {
  /** ترقيم متواصل عبر شرائح القسم الواحد */
  number: number;
  text: string;
}

export interface LessonPhase {
  number: 1 | 2 | 3 | 4 | 5 | 6;
  title: string;
  /** مدة المرحلة كاملة بالدقائق، وليست مدة الشريحة المفردة. */
  minutes: number;
}

export interface SlideIllustration {
  /** هوية الشخصية أو الشخصيات التي تمثلها الرسمة المخصصة. */
  characters: CharacterKey[];
  /** ملف رسمة جديدة مصممة للشريحة داخل public/lesson-art. */
  artwork?: string;
  /** وصف الوضعية المختارة، ويُستخدم أيضًا كبديل نصي للشخصية. */
  pose: string;
  /** جملة قصيرة تظهر في فقاعة كلام بجوار الشخصية. */
  speech?: string;
}

export interface GuidedCard {
  title: string;
  text: string;
  tone?: "blue" | "pink" | "mint" | "gold" | "safe" | "private";
  character?: CharacterKey;
  /** رسمة مخصصة للبطاقة بدل الصورة العامة للشخصية. */
  artwork?: string;
  pose?: string;
}

export type GuidedLayout =
  | "agenda"
  | "question"
  | "definition"
  | "grid"
  | "compare"
  | "practice"
  | "steps"
  | "model"
  | "keywords"
  | "trio"
  | "presentation"
  | "listening"
  | "reflection";

/** شريحة إثرائية ذات محتوى منظّم، مستخدمة للحصة الأولى ذات الـ18 شريحة. */
export interface GuidedSlide {
  kind: "guided";
  id: string;
  /** وظيفة الشريحة التعليمية في تسلسل الحصة، للاستخدام في خطة المعلم لا كعنصر مرئي. */
  purpose?: string;
  phase: LessonPhase;
  title: string;
  icon: SessionIconName;
  layout: GuidedLayout;
  body?: string;
  items?: string[];
  cards?: GuidedCard[];
  example?: { label: string; text: string };
  prompt?: string;
  note?: string;
  /** صورة ووضعية وفق موضوع الشريحة؛ الشريحة الثلاثية تستخدم صور البطاقات. */
  illustration?: SlideIllustration;
}

export interface LessonClosing {
  /** وظيفة الشريحة التعليمية في تسلسل الحصة، للاستخدام في خطة المعلم لا كعنصر مرئي. */
  purpose?: string;
  headline: string;
  reflection: string;
  nextLesson: string;
  illustration?: SlideIllustration;
}

export type LessonSlide =
  | {
      kind: "title";
      id: "title";
      /** وظيفة الشريحة التعليمية في تسلسل الحصة، للاستخدام في خطة المعلم لا كعنصر مرئي. */
      purpose?: string;
      phase?: LessonPhase;
      illustration?: SlideIllustration;
    }
  /** هدف الحصة في شريحة مستقلة: فكرة واحدة لكل شريحة */
  | { kind: "goal"; id: "goal" }
  | {
      kind: "activity" | "challenge";
      id: string;
      /** رقم الجزء الحالي عند توزيع القسم على عدة شرائح */
      part: number;
      parts: number;
      steps: SlideStep[];
    }
  | GuidedSlide
  | {
      kind: "end";
      id: "end";
      /** وظيفة الشريحة التعليمية في تسلسل الحصة، للاستخدام في خطة المعلم لا كعنصر مرئي. */
      purpose?: string;
      phase?: LessonPhase;
      /** عنوان خاص عند وجود إنجاز أو انعكاس ختامي للحصة. */
      headline?: string;
      reflection?: string;
      nextLesson?: string;
      illustration?: SlideIllustration;
    };

export const SECTION_META: Record<
  "activity" | "challenge",
  { label: string; icon: SessionIconName }
> = {
  activity: { label: "نجرّب معًا", icon: "puzzle" },
  challenge: { label: "تحدّي المحطة", icon: "mic" },
};

/**
 * يقسّم النص عند حدود الجمل («. ») أو عند «، ثم » فقط.
 * كل كلمات النص الأصلي تبقى كما هي وبترتيبها: الفاصلة قبل «ثم» تتحول إلى نقطة
 * ختامية للخطوة السابقة، وتبقى كلمة «ثم» في مطلع الخطوة التالية.
 */
export function splitIntoSteps(text: string): string[] {
  const steps: string[] = [];
  let current = "";
  const flush = () => {
    const step = current.trim().replace(/[،,]\s*$/u, "");
    if (step) steps.push(/[.!؟?]$/u.test(step) ? step : `${step}.`);
    current = "";
  };
  for (const token of text.split(/(\. +|[؟!] +|، +ثم +)/u)) {
    if (/^[.؟!] +$/u.test(token)) flush();
    else if (/^، +ثم +$/u.test(token)) {
      flush();
      current = "ثم ";
    } else current += token;
  }
  flush();
  return steps;
}

/**
 * يوزّع الخطوات على شرائح: ما دامت الخطوات قليلة وقصيرة تبقى في شريحة واحدة،
 * وإذا طال المحتوى انتقل الفائض إلى شرائح تالية بدل تصغير الخط أو القصّ.
 */
export function chunkSteps(steps: string[]): string[][] {
  const chunks: string[][] = [];
  let group: string[] = [];
  let chars = 0;
  for (const step of steps) {
    const length = Array.from(step).length;
    if (
      group.length > 0 &&
      (group.length >= SLIDE_STEP_BUDGET || chars + length > SLIDE_TEXT_BUDGET)
    ) {
      chunks.push(group);
      group = [];
      chars = 0;
    }
    group.push(step);
    chars += length;
  }
  if (group.length) chunks.push(group);
  return chunks;
}

/**
 * الحصة الأولى لها تسلسل تعليمي خاص من 18 شريحة موزع على ست مراحل.
 * بقية الحصص تستخدم قالب العنوان والهدف والنشاط والتحدي والنهاية المعتاد.
 */
export function buildSlides(session: Session): LessonSlide[] {
  if (session.id === 1) {
    return [
      {
        kind: "title",
        id: "title",
        purpose: FIRST_LESSON_PURPOSES.title,
        phase: FIRST_LESSON_PHASES[0],
        illustration: {
          characters: ["lailaWave"],
          artwork: "/lesson-art/slide-01-cover-laila.webp",
          pose: "ليلى تلوّح مرحّبة ببداية الحصة.",
          speech: "أهلًا بكم! مساحة الكلام للجميع.",
        },
      },
      ...FIRST_LESSON_SLIDES.map((slide) => ({
        ...slide,
        purpose: FIRST_LESSON_PURPOSES[slide.id],
      })),
      {
        kind: "end",
        id: "end",
        purpose: FIRST_LESSON_PURPOSES.end,
        phase: FIRST_LESSON_PHASES[5],
        ...FIRST_LESSON_CLOSING,
      },
    ];
  }

  const slides: LessonSlide[] = [
    { kind: "title", id: "title" },
    { kind: "goal", id: "goal" },
  ];
  for (const kind of ["activity", "challenge"] as const) {
    const chunks = chunkSteps(splitIntoSteps(session[kind]));
    let offset = 0;
    chunks.forEach((texts, index) => {
      slides.push({
        kind,
        id: `${kind}-${index}`,
        part: index + 1,
        parts: chunks.length,
        steps: texts.map((text, stepIndex) => ({
          number: offset + stepIndex + 1,
          text,
        })),
      });
      offset += texts.length;
    });
  }
  slides.push({ kind: "end", id: "end" });
  return slides;
}
