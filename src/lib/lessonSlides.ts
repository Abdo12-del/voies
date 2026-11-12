import type { Session, SessionIconName } from "../data/sessions";

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

export type LessonSlide =
  | { kind: "title"; id: "title" }
  | {
      kind: "activity" | "challenge";
      id: string;
      /** رقم الجزء الحالي عند توزيع القسم على عدة شرائح */
      part: number;
      parts: number;
      steps: SlideStep[];
    }
  | { kind: "end"; id: "end" };

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
 * الشرائح الأساسية: العنوان والهدف، ثم النشاط (خطوات عند الحاجة)،
 * ثم التحدي، ثم شريحة النهاية. أقسام طويلة تُنتج شرائح إضافية مرقّمة.
 */
export function buildSlides(session: Session): LessonSlide[] {
  const slides: LessonSlide[] = [{ kind: "title", id: "title" }];
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
