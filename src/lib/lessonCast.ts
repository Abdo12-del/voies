import type { CharacterKey } from "../components/Character";
import type { LessonSlide } from "./lessonSlides";

/**
 * ربط وضعيات «شخصيات المتحدث» بأنواع الشرائح والمواقف:
 *
 * | الموقف                     | الوضعية          |
 * | -------------------------- | ---------------- |
 * | العنوان / الترحيب           | تلويح            |
 * | هدفي اليوم                 | إشارة «لدي فكرة» |
 * | النشاط                     | شرح وإشارة       |
 * | التحدي                     | ثقة وعزم         |
 * | النهاية                    | نجاح واحتفال     |
 * | المراجعة و«مَن يتحدث؟»      | تفكير            |
 * | إجابة خاطئة                | تشجيع            |
 *
 * شريحة النشاط تتناوب بين ليلى وسامي حسب رقم الحصة كي لا يتكرّر الوجه نفسه.
 */
export type CastSituation = LessonSlide["kind"] | "speaker" | "wrong";

export interface CastOptions {
  sessionId: number;
  review?: boolean;
}

export function castFor(
  situation: CastSituation,
  { sessionId, review = false }: CastOptions,
): CharacterKey[] {
  switch (situation) {
    case "title":
      return [review ? "samiThink" : "lailaWave"];
    case "goal":
      return ["sisterIdea"];
    case "activity":
      return [sessionId % 2 === 1 ? "lailaExplain" : "samiExplain"];
    case "challenge":
      return ["samiConfident"];
    case "end":
      // المراجعة لا تحتفل بإنجاز جديد: نجاح هادئ بلا احتفال موسّع.
      return review ? ["samiSuccess"] : ["samiSuccess", "sisterCheer"];
    case "speaker":
      return ["samiThink"];
    case "wrong":
      return ["lailaEncourage"];
  }
}

/** عبارة الشخصية الصغيرة في شريحة العنوان. */
export function titleSpeech(review: boolean): string {
  return review ? "لنتذكّر معًا ما تعلمناه" : "أنا معك في هذه الخطوة";
}
