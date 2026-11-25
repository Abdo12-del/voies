import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { seedClassroom } from './classroom-fixture';

for (const viewport of [{width:1440,height:900},{width:390,height:844},{width:844,height:390}]) {
  test(`home entry sequence works at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await seedClassroom(page);
    await page.goto('/#/map');
    await page.locator('[data-station-button="1"]').click();
    const entry = page.getByRole('main', { name:'الدخول إلى منزل العائلة' });
    await expect(entry).toBeVisible();
    await expect(page.locator('.city-app')).toHaveAttribute('inert', '');
    await expect(page.getByRole('button', { name:/تخطّي الانتقال/ })).toBeFocused();
    await expect(page).toHaveURL(/#\/map/);
    await expect(page.locator('.house-entry-hall, .house-entry-bedroom-door, .house-entry-bedroom')).toHaveCount(3);
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await expect(page).toHaveURL(/#\/lesson\/1$/, { timeout: 12000 });
    await expect(entry).toHaveCount(0);
    await expect(page.getByRole('heading', { name:'واجب الغد' })).toBeVisible();
  });
}

test('skip works, while reduced motion opens the lesson immediately', async ({page}) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await seedClassroom(page);
  await page.goto('/#/map');
  await page.locator('.current-start').click();
  await page.getByRole('button', { name:/تخطّي الانتقال/ }).click();
  await expect(page).toHaveURL(/#\/lesson\/1$/);
  await page.getByRole('button', { name:'العودة إلى رحلتي' }).click();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.locator('.current-start').click();
  await expect(page).toHaveURL(/#\/lesson\/1$/);
  await expect(page.locator('.house-entry')).toHaveCount(0);
});

test('review opens the same home entry and preserves progress', async ({page}) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await seedClassroom(page, 20);
  await page.goto('/#/map');
  await page.getByRole('button', { name:'المستوى الأول', exact:true }).click();
  await page.locator('[data-station-button="1"]').click();
  await Promise.all([
    page.locator('.house-entry').waitFor({ state:'visible' }),
    page.getByRole('button', { name:'مراجعة الحصة' }).click(),
  ]);
  await expect(page).toHaveURL(/#\/lesson\/1\?mode=review$/, { timeout: 12000 });
  await expect(page.getByText('وضع المراجعة')).toBeVisible();
});

test('navigation away during the transition cancels pending entry', async ({page}) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await seedClassroom(page);
  await page.goto('/#/map');
  await page.locator('.current-start').click();
  await expect(page.locator('.house-entry')).toBeVisible();
  await page.evaluate(() => { window.location.hash = '#/other'; });
  await expect(page.locator('.house-entry')).toHaveCount(0);
  await page.waitForTimeout(7100);
  await expect(page).toHaveURL(/#\/other$/);
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
});

test('separate hallway and doorway drawings lead to the lesson room', async ({page}) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await seedClassroom(page);
  await page.goto('/#/map');
  await page.locator('.current-start').click();
  await expect(page.locator('.house-entry')).toBeVisible();
  const images = await page.evaluate(() => ['.house-entry-hall', '.house-entry-bedroom-door', '.house-entry-bedroom'].map(selector => getComputedStyle(document.querySelector(selector)!).backgroundImage));
  expect(images[0]).toContain('/sisters-story/hallway.webp');
  expect(images[1]).toContain('/sisters-story/bedroom-door.webp');
  expect(images[2]).toContain('/sisters-story/bedroom.webp');
  expect(new Set(images).size).toBe(3);
  await page.getByRole('button', {name:/تخطّي الانتقال/}).click();
  const lessonImage = await page.locator('.sisters-lesson').evaluate(el => getComputedStyle(el).backgroundImage);
  expect(images[2]).toEqual(lessonImage);
});
