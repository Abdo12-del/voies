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

for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }, { width: 320, height: 568 }, { width: 844, height: 390 }]) {
  test(`zoom controls stay usable and aligned at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await seedClassroom(page);
    await page.goto('/#/map');
    const world = page.locator('.city-world');
    const zoom = page.getByRole('group', { name: 'تقريب الخريطة وإبعادها' });
    const plus = zoom.getByRole('button', { name: 'تقريب الخريطة' });
    const minus = zoom.getByRole('button', { name: 'إبعاد الخريطة' });
    await expect(world).toHaveCSS('width', '1584px');
    await expect(minus).toBeDisabled();
    const zoomBox = (await zoom.boundingBox())!;
    for (const sel of ['.app-header .brand', '.header-tools', '.city-intro', '.city-current', '.game-bar']) {
      const other = page.locator(sel);
      if (!await other.isVisible()) continue;
      const r = (await other.boundingBox())!;
      expect(zoomBox.x < r.x + r.width && zoomBox.x + zoomBox.width > r.x && zoomBox.y < r.y + r.height && zoomBox.y + zoomBox.height > r.y, `${sel} overlaps zoom`).toBe(false);
    }
    for (const width of [1980, 2376, 2772, 3168]) {
      await plus.click();
      await expect(world).toHaveCSS('width', `${width}px`);
    }
    await expect(plus).toBeDisabled();
    await minus.click();
    await expect(world).toHaveCSS('width', '2772px');
    const aligned = await page.evaluate(() => {
      const map = document.querySelector<HTMLElement>('.city-world')!.getBoundingClientRect();
      const stop = document.querySelector<HTMLElement>('[data-station="1"]')!.getBoundingClientRect();
      return { x: Math.abs((stop.left + stop.width / 2 - map.left) / map.width - 292 / 1584), y: Math.abs((stop.top + stop.height / 2 - map.top) / map.height - 201 / 672) };
    });
    expect(aligned.x).toBeLessThan(0.001);
    expect(aligned.y).toBeLessThan(0.001);
    await page.getByRole('button', { name: 'محطتي', exact: true }).click();
    await expect(page.locator('[data-station="1"]')).toBeVisible();
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  });
}

test('zoom keeps the viewed part of the city centred when scrolling permits', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 600 });
  await seedClassroom(page);
  await page.goto('/#/map');
  const viewport = page.locator('.city-viewport');
  await viewport.evaluate((el) => { el.scrollLeft = 550; el.scrollTop = 35; });
  const center = () => viewport.evaluate((el) => {
    const map = el.querySelector<HTMLElement>('.city-world')!;
    return [(el.scrollLeft + el.clientWidth / 2 - map.offsetLeft) / map.offsetWidth, (el.scrollTop + el.clientHeight / 2 - map.offsetTop) / map.offsetHeight];
  });
  const before = await center();
  await page.getByRole('button', { name: 'تقريب الخريطة' }).click();
  const after = await center();
  expect(Math.abs(before[0] - after[0])).toBeLessThan(0.002);
  expect(Math.abs(before[1] - after[1])).toBeLessThan(0.002);
});

test('all stops remain separately selectable at the widest view', async ({ page }) => {
  await seedClassroom(page);
  await page.goto('/#/map');
  const overlaps = await page.evaluate(() => {
    const stops = [...document.querySelectorAll<HTMLElement>('.city-stop')].map((el) => {
      const r = el.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2, id: el.dataset.station };
    });
    return stops.flatMap((a, i) => stops.slice(i + 1).filter((b) => Math.hypot(a.x - b.x, a.y - b.y) < 40).map((b) => `${a.id}/${b.id}`));
  });
  expect(overlaps).toEqual([]);
});
