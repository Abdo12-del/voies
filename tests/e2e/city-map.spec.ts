import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { seedClassroom } from "./classroom-fixture";

for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }, { width: 320, height: 568 }, { width: 844, height: 390 }]) {
  test(`city navigation and accessibility ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await seedClassroom(page);
    await page.goto('/#/map');
    await expect(page.locator('.city-art')).toBeVisible();
    await expect(page.locator('[data-station-button]')).toHaveCount(32);
    await expect(page.locator('[data-station="1"]')).toHaveClass(/is-current/);
    await expect(page.locator('.city-current')).toContainText('الحصة 1');
    const rects = await page.evaluate(() => {
      const rect = (s: string) => document.querySelector<HTMLElement>(s)!.getBoundingClientRect();
      const a = rect('.city-current'), b = rect('.game-bar');
      return { fits: a.left >= 0 && a.right <= innerWidth && a.top >= 0 && a.bottom <= innerHeight, overlaps: a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top };
    });
    expect(rects).toEqual({ fits: true, overlaps: false });
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await page.getByRole('button', { name: 'المستوى الثاني', exact: true }).click();
    await expect(page.getByRole('button', { name: 'المستوى الثاني', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await page.getByRole('button', { name: 'محطتي', exact: true }).click();
    await expect(page.getByRole('button', { name: 'المستوى الأول', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await page.locator('[data-station-button="2"]').click();
    await expect(page.getByRole('dialog')).toContainText('لم تُفتح بعد');
    await page.keyboard.press('Escape');
    await page.locator('.current-start').click();
    await expect(page).toHaveURL(/#\/lesson\/1/);
  });
}

test('completed lessons can be reviewed and level navigation keeps progress', async ({ page }) => {
  await seedClassroom(page, 20);
  await page.goto('/#/map');
  await expect(page.locator('[data-station="21"]')).toHaveClass(/is-current/);
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '20');
  await page.getByRole('button', { name: 'المستوى الأول', exact: true }).click();
  await page.locator('[data-station-button="1"]').click();
  await expect(page.getByRole('dialog')).toContainText('مراجعة الحصة');
  await page.getByRole('button', { name: 'مراجعة الحصة' }).click();
  await expect(page).toHaveURL(/#\/lesson\/1\?mode=review/);
});
