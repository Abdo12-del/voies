import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { seedClassroom } from "./classroom-fixture";

const viewports = [
  { width: 320, height: 568 },
  { width: 320, height: 640 },
  { width: 390, height: 844 },
  { width: 640, height: 360 },
  { width: 844, height: 390 },
];

for (const viewport of viewports) {
  for (const completed of [0, 2, 7, 20, 31]) {
    test(`${viewport.width}×${viewport.height}: current stop and controls at ${completed}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await seedClassroom(page, completed);
      await page.goto("/#/map");
      await page.evaluate(() => document.fonts.ready);
      const current = page.locator(`[data-station="${completed + 1}"]`);
      await expect(current).toHaveClass(/is-current/);
      await expect(page.getByRole("progressbar")).toHaveAttribute("aria-valuenow", String(completed));
      await expect(page.locator(".station-you")).toContainText("المسار");
      const geometry = await page.evaluate(() => {
        const box = (selector: string) => document.querySelector<HTMLElement>(selector)!.getBoundingClientRect();
        const overlaps = (a: DOMRect, b: DOMRect) => a.left < b.right - 1 && a.right > b.left + 1 && a.top < b.bottom - 1 && a.bottom > b.top + 1;
        const inViewport = (r: DOMRect) => r.left >= -1 && r.right <= innerWidth + 1 && r.top >= -1 && r.bottom <= innerHeight + 1;
        const badge = box(".station-you");
        const card = box(".current-card");
        const title = document.querySelector<HTMLElement>(".current-card h2")!;
        const buttons = Array.from(document.querySelectorAll<HTMLElement>(".world-switch button"));
        return {
          currentFits: inViewport(box(".station.is-current")) && inViewport(badge) && inViewport(card),
          badgeOverlapsHeader: [".brand", ".header-tools"].some((s) => overlaps(badge, box(s))),
          cardOverlapsBar: overlaps(card, box(".game-bar")),
          titleOverflows: title.scrollHeight > title.clientHeight + 1,
          levelTextOverflows: buttons.some((b) => b.scrollWidth > b.clientWidth + 1),
        };
      });
      expect(geometry).toEqual({ currentFits: true, badgeOverlapsHeader: false, cardOverlapsBar: false, titleOverflows: false, levelTextOverflows: false });
      if (viewport.height < 550) {
        expect((await page.locator(".current-start").boundingBox())!.height).toBeGreaterThanOrEqual(44);
        // Although the visual labels are omitted in the short layout, the full
        // session title and status remain available on the station button.
        await expect(page.locator(`[data-station-button="${completed + 1}"]`)).toHaveAttribute("aria-label", /الحصة .*متاحة الآن/);
      }
      if (completed === 0) {
        const axe = await new AxeBuilder({ page }).analyze();
        expect(axe.violations).toEqual([]);
      }
    });
  }

  test(`${viewport.width}×${viewport.height}: level navigation preserves progress`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await seedClassroom(page, 7);
    await page.goto("/#/map");
    const current = page.locator('[data-station="8"]');
    await expect(current).toHaveClass(/is-current/);
    await page.getByRole("button", { name: "المستوى الثاني", exact: true }).click();
    await expect(page.getByRole("button", { name: "المستوى الثاني", exact: true })).toHaveAttribute("aria-pressed", "true");
    await page.getByRole("button", { name: "محطتي", exact: true }).click();
    await expect.poll(async () => {
      const r = await current.boundingBox();
      return Math.abs(r!.x + r!.width / 2 - viewport.width / 2);
    }).toBeLessThan(3);
    await expect(page.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "7");
    await page.reload();
    await expect(page.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "7");
  });
}
