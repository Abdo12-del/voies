import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { seedClassroom } from './classroom-fixture';

import { SISTERS_STORY as scenes } from '../../src/data/sistersStory';
for (const { width, height } of [{width:1440,height:900}, {width:820,height:1180}, {width:390,height:844}, {width:320,height:568}, {width:844,height:390}]) {
  test(`story remains readable and still at ${width}x${height}`, async ({ page }) => {
    await page.setViewportSize({width,height});
    await page.emulateMedia({reducedMotion:'no-preference'});
    await seedClassroom(page);
    await page.goto('/#/lesson/1');
    await page.evaluate(() => document.fonts.ready);
    for (const [index, {title, pose, speaker, text}] of scenes.entries()) {
      await expect(page.getByRole('heading', {name:title})).toBeVisible();
      const figure = page.locator('.sisters-figures img');
      await expect(figure).toHaveAttribute('src', `/sisters-story/solo/${pose}.webp`);
      await expect(figure).toHaveCSS('animation-name', 'none');
      await expect(figure).toHaveCount(1);
      await expect(page.locator('.sisters-line')).toHaveCount(1);
      await expect(page.locator('.sisters-speaker')).toHaveText(speaker);
      await expect(page.locator('.sisters-line p')).toHaveText(text);
      await expect.poll(() => figure.evaluate(el => (el as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
      const layout = await page.evaluate(() => {
        const card = document.querySelector('.sisters-card')!;
        const c = card.getBoundingClientRect(), n = document.querySelector('.sisters-nav')!.getBoundingClientRect(), t = document.querySelector('.sisters-top')!.getBoundingClientRect();
        return { fits: c.left >= 0 && c.right <= innerWidth && c.top >= 0 && c.bottom <= innerHeight, readable: card.scrollHeight <= card.clientHeight + 1, clearNav: c.bottom <= n.top || c.top >= n.bottom, clearTop: c.top >= t.bottom || c.bottom <= t.top };
      });
      expect(layout).toEqual({fits:true, readable:true, clearNav:true, clearTop:true});
      if (index === 0 && (width === 390 || width === 1440)) expect((await new AxeBuilder({page}).analyze()).violations).toEqual([]);
      if (index < scenes.length - 1) await page.getByRole('button', {name:'التالي', exact:true}).click();
    }
    await expect(page.getByRole('button', {name:/إنهاء الحصة/})).toBeVisible();
  });
}

test('keyboard, completion and review keep progress semantics', async ({page}) => {
  await seedClassroom(page);
  await page.goto('/#/lesson/1');
  await expect(page.getByRole('heading', {name:'واجب الغد'})).toBeFocused();
  await page.keyboard.press('ArrowLeft');
  await expect(page.getByRole('heading', {name:'ماذا يمكن أن أقول؟'})).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('heading', {name:'واجب الغد'})).toBeVisible();
  await page.keyboard.press('End');
  await page.getByRole('button', {name:/إنهاء الحصة/}).click();
  await expect(page).toHaveURL(/#\/map/);
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '1');
  await page.goto('/#/lesson/1?mode=review');
  await expect(page.getByText('وضع المراجعة')).toBeVisible();
  await page.keyboard.press('End');
  await expect(page.getByRole('button', {name:/إنهاء الحصة/})).toHaveCount(0);
  await page.getByRole('button', {name:'العودة إلى رحلتي'}).click();
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '1');
});

test('one speaker speaks at a time and the reply waits for the learner', async ({page}) => {
  await seedClassroom(page);
  await page.goto('/#/lesson/1');
  for (let i = 0; i < 3; i++) await page.getByRole('button', {name:'التالي', exact:true}).click();
  await expect(page.getByText('ماذا أقول أولًا؟')).toBeVisible();
  await expect(page.locator('.sisters-speaker')).toHaveText('الأخت الصغيرة');
  await expect(page.getByText(/ابدئي بتحية/)).toHaveCount(0);
  await page.waitForTimeout(1500);
  await expect(page.getByText('ماذا أقول أولًا؟')).toBeVisible();
  await page.getByRole('button', {name:'التالي', exact:true}).click();
  await expect(page.locator('.sisters-speaker')).toHaveText('ليلى');
  await expect(page.getByText(/ابدئي بتحية/)).toBeVisible();
  await expect(page.getByText('ماذا أقول أولًا؟')).toHaveCount(0);
});

test('the story teaches beginning, a shareable middle, privacy and an ending before practice', async ({page}) => {
  await seedClassroom(page);
  await page.goto('/#/lesson/1');
  const ids = ['name-answer', 'age-answer', 'age-learner', 'school-answer', 'class-answer', 'school-learner', 'middle-ideas', 'hobby-example', 'hobby-learner', 'private-examples', 'private-context', 'private-guidance', 'ending-answer', 'model-intro', 'model-school', 'model-interests', 'try-young', 'learner', 'challenge'];
  const indexes = ids.map(id => scenes.findIndex(scene => scene.id === id));
  expect(indexes.every((index, i) => index >= 0 && (i === 0 || index > indexes[i - 1]))).toBe(true);
  for (let i = 0; i < scenes.length; i++) {
    if (ids.includes(scenes[i].id)) {
      await expect(page.locator('.sisters-line p')).toHaveText(scenes[i].text);
      if (scenes[i].id === 'private-examples') await expect(page.locator('.sisters-line p')).toContainText('عنوان المنزل ورقم الهاتف وكلمات المرور');
      if (scenes[i].id === 'private-guidance') await expect(page.locator('.sisters-line p')).toContainText('شخصًا بالغًا تثقين به');
      if (scenes[i].id === 'private-context') await expect(page.locator('.sisters-line p')).toContainText('لا مع الغرباء أو على الإنترنت');
      if (scenes[i].id === 'learner') for (const detail of ['اسمك', 'عمرك', 'مدرستك', 'صفّك', 'تحبّه', 'هوايتك']) await expect(page.locator('.sisters-line p')).toContainText(detail);
    }
    if (i < scenes.length - 1) await page.getByRole('button', {name:'التالي', exact:true}).click();
  }
});

test('the room begins at a natural scale and the camera focuses only when clarity needs it', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.setViewportSize({ width: 1568, height: 735 });
  await seedClassroom(page);
  await page.goto('/#/lesson/1');
  const stage = page.locator('.sisters-stage'), room = page.locator('.sisters-room');
  await expect(stage).not.toHaveClass(/is-teaching/);
  await expect(room).toHaveCSS('transform', 'none');
  for (let i = 0; i < 4; i++) await page.getByRole('button', { name:'التالي', exact:true }).click();
  await expect(stage).toHaveClass(/is-teaching/);
  await expect(stage).toHaveClass(/needs-camera/);
  await expect.poll(() => room.evaluate(el => new DOMMatrix(getComputedStyle(el).transform).a)).toBeGreaterThan(1.3);
  await page.waitForTimeout(900);
  const camera = await room.evaluate(el => getComputedStyle(el).transform);
  await page.getByRole('button', { name:'التالي', exact:true }).click();
  await expect(room).toHaveCSS('transform', camera);
  await expect(page.locator('.sisters-figures img')).toHaveCSS('animation-name', 'none');
  await page.waitForTimeout(800);
  await expect(room).toHaveCSS('transform', camera);
  await expect(page.locator('.sisters-speaker')).toHaveText('الأخت الصغيرة');

  // On a narrow portrait screen the speaker is already large enough; the room
  // stays wide instead of applying a gratuitous camera move.
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(stage).not.toHaveClass(/needs-camera/);
  await expect(room).toHaveCSS('transform', 'matrix(1, 0, 0, 1, 0, 0)');
});
