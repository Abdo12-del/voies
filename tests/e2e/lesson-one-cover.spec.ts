import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { seedClassroom } from "./classroom-fixture";

for (const [width, height] of [[1440, 900], [820, 1180], [390, 844], [320, 568], [844, 390]]) {
  test(`first lesson cover fits ${width}×${height} and keeps navigation`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await seedClassroom(page, 0);
    await page.goto("/#/lesson/1");
    await page.evaluate(() => document.fonts.ready);
    const heading = page.getByRole("heading", { name: "أهلًا بي في مساحة الكلام" });
    await expect(heading).toBeVisible();
    await expect(page.getByText("أتعرّف على رحلتي، وأقدّم نفسي بجملة قصيرة وابتسامة.")).toBeVisible();
    await expect(page.locator(".lesson-one-figure img")).toHaveAttribute("src", "/lesson-one/laila-welcome.webp");
    const layout = await page.evaluate(() => {
      const rect = (selector: string) => document.querySelector(selector)!.getBoundingClientRect();
      const overlaps = (a: DOMRect, b: DOMRect) => a.left < b.right - 1 && a.right > b.left + 1 && a.top < b.bottom - 1 && a.bottom > b.top + 1;
      const fits = (r: DOMRect) => r.left >= -1 && r.top >= -1 && r.right <= innerWidth + 1 && r.bottom <= innerHeight + 1;
      const figure = rect(".lesson-one-figure");
      const nav = rect(".slide-nav");
      const content = [".lesson-one-eyebrow", ".lesson-one-words h2", ".lesson-one-intro", ".lesson-one-start"].map(rect);
      return {
        contentFits: content.every(fits),
        figureFits: fits(figure),
        contentOverlapsFigure: content.some((r) => overlaps(r, figure)),
        contentOverlapsControls: content.some((r) => [nav, ...Array.from(document.querySelectorAll(".lesson-chip"), (el) => el.getBoundingClientRect())].some((c) => overlaps(r, c))),
        figureOverlapsNavigation: overlaps(figure, nav),
        pageOverflow: document.documentElement.scrollHeight > innerHeight || document.body.scrollHeight > innerHeight,
      };
    });
    expect(layout).toEqual({ contentFits: true, figureFits: true, contentOverlapsFigure: false, contentOverlapsControls: false, figureOverlapsNavigation: false, pageOverflow: false });
    if (width === 390 || width === 1440) {
      expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    }
    await page.getByRole("button", { name: "هيا نبدأ" }).click();
    await expect(page.locator(".slide-counter bdi")).toHaveText("2 من 5");
    await expect(page.locator(".lesson-one-goal")).toBeVisible();
    await page.getByRole("button", { name: "السابق", exact: true }).click();
    await expect(heading).toBeVisible();
    await page.getByRole("button", { name: "العودة إلى رحلتي" }).click();
    await expect(page.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "0");
  });
}

test("characters stay still and text respects reduced motion", async ({ page }) => {
  await seedClassroom(page, 0);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/#/lesson/1");
  await expect(page.locator(".lesson-one-word").first()).toHaveCSS("animation-name", "lesson-one-word");
  for (let i = 0; i < 5; i++) {
    const figure = page.locator(".slide[role=group] .lesson-one-figure");
    await expect(figure).toHaveCSS("animation-name", "none");
    await expect(figure.locator("img")).toHaveCSS("animation-name", "none");
    if (i < 4) {
      await page.getByRole("button", { name: "التالي", exact: true }).click();
      await expect(page.locator(".is-story-exiting")).toHaveCount(0);
    }
  }
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator(".lesson-one-word").first()).toHaveCSS("animation-name", "none");
});
