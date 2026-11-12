import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { CHARACTERS, type CharacterKey } from "../src/components/Character";
import { SESSIONS } from "../src/data/sessions";
import { castFor } from "../src/lib/lessonCast";
import { buildSlides } from "../src/lib/lessonSlides";

/** يقرأ ترويسة VP8X في WebP: الأبعاد وعلم القناة الشفافة. */
function webpInfo(file: string) {
  const bytes = readFileSync(new URL(`../public${file}`, import.meta.url));
  const tag = (at: number) => bytes.subarray(at, at + 4).toString("ascii");
  const u24 = (at: number) =>
    bytes[at] | (bytes[at + 1] << 8) | (bytes[at + 2] << 16);
  return {
    riff: tag(0) === "RIFF" && tag(8) === "WEBP",
    extended: tag(12) === "VP8X",
    alpha: (bytes[20] & 0x10) !== 0,
    width: u24(24) + 1,
    height: u24(27) + 1,
    size: bytes.length,
  };
}

const lessonKeys = (Object.keys(CHARACTERS) as CharacterKey[]).filter(
  (key) => "lesson" in CHARACTERS[key],
);

describe("شخصيات المتحدث في عرض الحصة", () => {
  it("يربط كل نوع شريحة بوضعيته المطلوبة", () => {
    const pose = (key: CharacterKey) =>
      (CHARACTERS[key] as { pose?: string }).pose;
    expect(castFor("title", { sessionId: 1 }).map(pose)).toEqual([
      "تلوّح مرحّبة",
    ]);
    expect(castFor("challenge", { sessionId: 1 }).map(pose)[0]).toMatch(
      /واثق وعازم/,
    );
    expect(castFor("end", { sessionId: 1 }).map(pose)).toEqual([
      "إجابة صحيحة ونجاح",
      "تحتفل",
    ]);
    // المراجعة و«مَن يتحدث؟» ← تفكير؛ الإجابة الخاطئة ← تشجيع
    expect(castFor("title", { sessionId: 1, review: true }).map(pose)).toEqual([
      "يفكّر",
    ]);
    expect(castFor("speaker", { sessionId: 0 }).map(pose)).toEqual(["يفكّر"]);
    expect(castFor("wrong", { sessionId: 1 }).map(pose)[0]).toMatch(/تشجّع/);
    // النشاط ← شرح وإشارة، بالتناوب بين ليلى وسامي
    expect(castFor("activity", { sessionId: 1 })).toEqual(["lailaExplain"]);
    expect(castFor("activity", { sessionId: 2 })).toEqual(["samiExplain"]);
  });

  it("المراجعة لا تحتفل بإنجاز جديد", () => {
    expect(castFor("end", { sessionId: 4, review: true })).toEqual([
      "samiSuccess",
    ]);
  });

  it("كل شريحة في الحصص الـ32 لها شخصية من مكتبة المتحدث", () => {
    for (const session of SESSIONS)
      for (const review of [false, true])
        for (const slide of buildSlides(session)) {
          const cast = castFor(slide.kind, { sessionId: session.id, review });
          expect(cast.length).toBeGreaterThan(0);
          for (const key of cast) expect(lessonKeys).toContain(key);
        }
  });

  it("صور الشخصيات WebP شفافة بارتفاع 720px وبنسبة مطابقة للسجل وحجم خفيف", () => {
    expect(lessonKeys.length).toBe(8);
    for (const key of lessonKeys) {
      const c = CHARACTERS[key];
      const info = webpInfo(c.src);
      expect(info.riff && info.extended, c.src).toBe(true);
      expect(info.alpha, `${c.src} transparent`).toBe(true);
      expect(info.height, c.src).toBe(720);
      expect(info.width, c.src).toBe(Math.round(c.ratio * 720));
      expect(info.size, `${c.src} ≈50KB`).toBeLessThanOrEqual(60_000);
    }
  });

  it("الوضعية المولّدة موسومة بأصلها، والبقية من مكتبة Drive", () => {
    const origins = Object.fromEntries(
      lessonKeys.map((key) => [key, CHARACTERS[key].origin]),
    );
    expect(origins.lailaEncourage).toBe("generated");
    expect(lessonKeys.filter((key) => origins[key] === "drive").length).toBe(7);
  });
});
