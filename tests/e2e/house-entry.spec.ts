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

test('the bedroom remains in place while lesson elements appear without a map flash', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await seedClassroom(page);
  await page.goto('/#/map');
  await page.locator('.current-start').click();
  const bedroom = page.locator('.house-entry-bedroom');
  await expect(bedroom).toBeVisible();
  const handoff = await page.evaluate(() => new Promise<{ gap: boolean; lessonSeen: boolean; frame: { image: string; position: string; size: string; width: number; height: number } | null }>(resolve => {
    let gap = false, lessonSeen = false, seenAt = 0, tracking = false;
    let frame: { image: string; position: string; size: string; width: number; height: number } | null = null;
    const sample = (now: number) => {
      const entry = document.querySelector('.house-entry-bedroom');
      const lesson = document.querySelector('.sisters-lesson');
      if (!tracking && entry && Number(getComputedStyle(entry).opacity) >= .999) {
        tracking = true;
        const style = getComputedStyle(entry), rect = entry.getBoundingClientRect();
        frame = { image: style.backgroundImage, position: style.backgroundPosition, size: style.backgroundSize, width: rect.width, height: rect.height };
      }
      if (tracking && !lesson && (!entry || Number(getComputedStyle(entry).opacity) < .99)) gap = true;
      if (lesson && !lessonSeen) { lessonSeen = true; seenAt = now; }
      if (lessonSeen && now - seenAt > 150) resolve({ gap, lessonSeen, frame });
      else if (now - start > 20000) resolve({ gap: true, lessonSeen, frame });
      else requestAnimationFrame(sample);
    };
    const start = performance.now();
    requestAnimationFrame(sample);
  }));
  expect(handoff.gap).toBe(false);
  expect(handoff.lessonSeen).toBe(true);
  expect(handoff.frame).not.toBeNull();
  const lesson = page.locator('.sisters-lesson');
  const room = await lesson.evaluate(el => {
    const style = getComputedStyle(el), rect = el.getBoundingClientRect();
    return { image: style.backgroundImage, position: style.backgroundPosition, size: style.backgroundSize, width: rect.width, height: rect.height };
  });
  expect(room).toEqual(handoff.frame);
  await expect(page.locator('.sisters-figures')).toHaveCSS('animation-name', 'sisters-elements-in');
  await expect(page.locator('.sisters-card')).toHaveCSS('animation-name', 'sisters-elements-in');
  await expect(page.locator('.sisters-figures img')).toHaveCSS('animation-name', 'none');
  await expect(page.locator('.sisters-figures')).toHaveCSS('opacity', '1');
  await page.getByRole('button', { name: 'التالي', exact: true }).click();
  await expect(page.locator('.sisters-figures')).toHaveCSS('opacity', '1');
});

test('the speakers stand at the front floor rather than floating over the bed', async ({ page }) => {
  await page.setViewportSize({ width: 1568, height: 735 });
  await seedClassroom(page);
  await page.goto('/#/lesson/1');
  for (let i = 0; i < 3; i++) {
    const box = await page.locator('.sisters-figures').boundingBox();
    expect(box).not.toBeNull();
    expect(box!.y + box!.height).toBeGreaterThan(735 * .96);
    expect(box!.height).toBeCloseTo(735 * (i === 2 ? .54 : .44), 0);
    if (i < 2) await page.getByRole('button', { name: 'التالي', exact: true }).click();
  }
});
