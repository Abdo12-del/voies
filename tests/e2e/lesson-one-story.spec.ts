import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { seedClassroom } from "./classroom-fixture";

const slides = [
  { heading: "أهلًا بي في مساحة الكلام", figure: "laila-welcome", background: "bg-cover" },
  { heading: "هدفي اليوم", figure: "goal-introduce", background: "bg-cover" },
  { heading: "نجرّب معًا", figure: "activity-listen", background: "bg-goal" },
  { heading: "تحدّي المحطة", figure: "challenge-sami", background: "bg-challenge" },
  { heading: "نهاية الحصة", figure: "end-sister", background: "bg-end" },
];

for (const [width, height] of [[1440, 900], [820, 1180], [390, 844], [320, 568], [844, 390]]) {
  test(`all five scenes fit and navigate at ${width}×${height}`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await seedClassroom(page, 0);
    await page.goto("/#/lesson/1");
    await page.evaluate(() => document.fonts.ready);
    for (let i = 0; i < slides.length; i++) {
      const scene = page.locator(".lesson-one-cover");
      await expect(page.getByRole("heading", { name: slides[i].heading })).toBeVisible();
      await expect(scene.locator("img")).toHaveAttribute("src", `/lesson-one/${slides[i].figure}.webp`);
      await expect(scene).toHaveAttribute("style", new RegExp(slides[i].background));
      if (i === 2) {
        await expect(scene.getByText("سلّم على زميلك وعرّفه باسمك وشيء تحبه.", { exact: false })).toBeVisible();
        await expect(scene.getByText("ما اسمك وماذا تحب؟", { exact: false })).toBeVisible();
        await expect(scene).not.toContainText(/بطاقة|رسم|اصنع/);
      }
      const geometry = await page.evaluate(() => {
        const rect = (selector: string) => document.querySelector(selector)!.getBoundingClientRect();
        const overlaps = (a: DOMRect, b: DOMRect) => a.left < b.right - 1 && a.right > b.left + 1 && a.top < b.bottom - 1 && a.bottom > b.top + 1;
        const fits = (r: DOMRect) => r.left >= -1 && r.top >= -1 && r.right <= innerWidth + 1 && r.bottom <= innerHeight + 1;
        const figure = rect(".lesson-one-figure");
        const controls = [rect(".slide-nav"), ...Array.from(document.querySelectorAll(".lesson-chip"), (el) => el.getBoundingClientRect())];
        const elements = [".lesson-one-eyebrow", ".lesson-one-words h2", ".lesson-one-intro", ".lesson-one-start"].filter((s) => document.querySelector(s)).map(rect);
        return {
          fits: [figure, ...elements].every(fits),
          contentCollision: elements.some((r) => overlaps(r, figure) || controls.some((c) => overlaps(r, c))),
          figureOverNav: overlaps(figure, controls[0]),
          overflow: document.documentElement.scrollHeight > innerHeight || document.body.scrollHeight > innerHeight,
        };
      });
      expect(geometry, `scene ${i + 1}`).toEqual({ fits: true, contentCollision: false, figureOverNav: false, overflow: false });
      if (width === 390) expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
      if (i < 4) {
        await expect(page.getByRole("button", { name: "إنهاء الحصة" })).toHaveCount(0);
        await page.getByRole("button", { name: "التالي", exact: true }).click();
      }
    }
    await expect(page.getByText("بعد إنهاء أنشطة الحصة مع الصف", { exact: false })).toBeVisible();
    await page.getByRole("button", { name: "إنهاء الحصة" }).click();
    await expect(page.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "1");
    await page.reload();
    await expect(page.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "1");
  });
}

test("review never completes again and still shows all scenes", async ({ page }) => {
  await seedClassroom(page, 1);
  await page.goto("/#/lesson/1");
  await page.keyboard.press("End");
  await expect(page.getByRole("heading", { name: "نهاية الحصة" })).toBeVisible();
  await expect(page.getByText("درسنا هذه الحصة من قبل. المراجعة لا تغيّر تقدّم الرحلة.")).toBeVisible();
  await expect(page.getByRole("button", { name: "إنهاء الحصة" })).toHaveCount(0);
  await page.getByRole("button", { name: "العودة إلى رحلتي" }).click();
  await expect(page.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "1");
});

test("slides move in the navigation direction and outgoing content is inert", async ({ page }) => {
  await seedClassroom(page, 0);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/#/lesson/1");
  await page.keyboard.press("ArrowLeft");
  await expect(page.locator(".is-story-exiting")).toHaveAttribute("aria-hidden", "true");
  await expect(page.locator(".is-story-exiting")).toHaveAttribute("inert", "");
  await expect(page.getByRole("heading", { name: "هدفي اليوم" })).toBeVisible();
  await expect(page.locator(".is-story-entering")).toHaveCSS("animation-name", "story-slide-enter");
  await expect(page.locator(".is-story-exiting")).toHaveCount(0);
  await page.keyboard.press("ArrowRight");
  await expect(page.locator(".is-story-entering")).toHaveClass(/is-story-reverse/);
  await expect(page.getByRole("heading", { name: "أهلًا بي في مساحة الكلام" })).toBeVisible();
});
