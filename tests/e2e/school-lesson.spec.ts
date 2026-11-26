import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { seedClassroom } from './classroom-fixture';
import { SCHOOL_STORY } from '../../src/data/schoolStory';

for (const {width,height} of [{width:1440,height:900}, {width:820,height:1180}, {width:390,height:844}, {width:320,height:568}, {width:844,height:390}]) {
  test(`the school story and ending remain readable at ${width}x${height}`, async ({page}) => {
    await page.setViewportSize({width,height});
    await page.emulateMedia({reducedMotion:'reduce'});
    await seedClassroom(page, 1);
    await page.goto('/#/lesson/2');
    await page.evaluate(() => document.fonts.ready);
    for (const [index, scene] of SCHOOL_STORY.entries()) {
      await expect(page.getByRole('heading', {name:scene.title})).toBeFocused();
      await expect(page.locator('.sisters-line')).toHaveCount(1);
      await expect(page.locator('.sisters-speaker')).toHaveText(scene.speaker);
      await expect(page.locator('.sisters-line p')).toHaveText(scene.text);
      const figures = page.locator('.school-figures img');
      await expect(figures).toHaveCount(2);
      const active = page.locator('.school-figures.is-active img');
      await expect(active).toHaveCount(1);
      const facesPartner = !scene.visual && scene.address !== 'learner';
      const friendHallPose = scene.pose === 'friend-greet' ? 'greet' : scene.pose === 'friend-ideas' ? 'ideas' : 'explain';
      const expectedImage = scene.speaker === 'سارة' && facesPartner ? `/school-lesson/friend-hall-${friendHallPose}.webp` : scene.pose === 'friend-greet' ? '/school-entry/friend.webp' : scene.pose.startsWith('friend-') ? `/school-lesson/${scene.pose}.webp` : `/sisters-story/solo/${scene.pose}.webp`;
      await expect(active).toHaveAttribute('src', expectedImage);
      await expect(page.locator('.school-figures.is-active')).toHaveAttribute('data-facing', facesPartner ? 'partner' : 'viewer');
      if (scene.speaker === 'الطفلة') await expect(active).toHaveCSS('transform', facesPartner ? 'matrix(-1, 0, 0, 1, 0, 0)' : 'none');
      await expect.poll(() => active.evaluate(el => (el as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
      const layout = await page.evaluate(() => {
        const c = document.querySelector('.sisters-card')!, card = c.getBoundingClientRect(), n = document.querySelector('.sisters-nav')!.getBoundingClientRect(), t = document.querySelector('.sisters-top')!.getBoundingClientRect();
        const f = document.querySelector('.school-figures.is-active')!.getBoundingClientRect();
        return {fits:card.left >= 0 && card.right <= innerWidth && card.top >= 0 && card.bottom <= innerHeight, readable:c.scrollHeight <= c.clientHeight + 1, clearNav:card.bottom <= n.top || card.top >= n.bottom, clearTop:card.top >= t.bottom || card.bottom <= t.top, clearFigures:card.bottom <= f.top || card.top >= f.bottom || card.right <= f.left || card.left >= f.right};
      });
      expect(layout).toEqual({fits:true,readable:true,clearNav:true,clearTop:true,clearFigures:true});
      if (index === 0 && (width === 390 || width === 1440)) expect((await new AxeBuilder({page}).analyze()).violations).toEqual([]);
      if (index < SCHOOL_STORY.length - 1) await page.getByRole('button', {name:'التالي',exact:true}).click();
    }
    await expect(page.getByRole('button', {name:'الدخول إلى القسم'})).toBeVisible();
  });
}

test('breathing, posture and a response to forgetting follow the concern', async ({page}) => {
  await seedClassroom(page, 1);
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.goto('/#/lesson/2');
  const ids = ['hall-greeting','forgotten','father','inhale','exhale','breathe-practice','stance-intro','feet','shoulders','stance-practice','forget-question','forget-help','try','young-end','finish'];
  const positions = ids.map(id => SCHOOL_STORY.findIndex(scene => scene.id === id));
  expect(positions.every((value,i) => value >= 0 && (i === 0 || value > positions[i-1]))).toBe(true);
  expect(SCHOOL_STORY.find(scene => scene.id === 'father')?.text).toContain('أبي');
  expect(SCHOOL_STORY.find(scene => scene.id === 'breathe-practice')?.text).toContain('توقّف');
  expect(SCHOOL_STORY.find(scene => scene.id === 'feet')?.text).toContain('الجلوس');
  await expect(page.getByRole('heading', {name:'لقاء في الممر'})).toBeFocused();
  await page.keyboard.press('ArrowLeft');
  await expect(page.getByText(/أخاف أن أنسى ما حفظته/)).toBeVisible();
  await page.waitForTimeout(1200);
  await expect(page.getByRole('heading', {name:'ماذا لو نسيت؟'})).toBeVisible();
  await page.keyboard.press('ArrowLeft');
  await expect(page.getByRole('heading', {name:'لستِ وحدك'})).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('heading', {name:'ماذا لو نسيت؟'})).toBeFocused();
  await page.keyboard.press('End');
  await expect(page.getByRole('heading', {name:'نتقدّم معًا'})).toBeFocused();
  await page.getByRole('button', {name:'الدخول إلى القسم'}).click();
  await expect(page.getByRole('heading', {name:'وصلنا إلى صفّنا!'})).toBeFocused();
  await expect(page.getByRole('button', {name:/إنهاء الحصة/})).toHaveCount(0);
  await page.getByRole('button', {name:'إلى المنصّة'}).click();
  await expect(page.getByRole('heading', {name:'دوري على المنصّة'})).toBeFocused();
  await page.keyboard.press('End');
  await expect(page.getByRole('heading', {name:'خطوة أفتخر بها'})).toBeFocused();
  await page.getByRole('button', {name:/إنهاء الحصة/}).click();
  await expect(page).toHaveURL(/#\/map/);
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow','2');
  await page.goto('/#/lesson/2?mode=review');
  await expect(page.getByText('وضع المراجعة')).toBeVisible();
  await page.keyboard.press('End');
  await expect(page.getByRole('button', {name:'الدخول إلى القسم'})).toBeVisible();
  await expect(page.getByText('هذه مراجعة ولا تغيّر تقدّم الرحلة.')).toBeVisible();
  await page.getByRole('button', {name:'الدخول إلى القسم'}).click();
  await expect(page.getByRole('heading', {name:'وصلنا إلى صفّنا!'})).toBeFocused();
  await page.getByRole('button', {name:'إلى المنصّة'}).click();
  await page.keyboard.press('End');
  await expect(page.getByRole('heading', {name:'خطوة أفتخر بها'})).toBeFocused();
  await expect(page.getByText('هذه مراجعة ولا تغيّر تقدّم الرحلة.')).toBeVisible();
  await expect(page.getByRole('button', {name:/إنهاء الحصة/})).toHaveCount(0);
  await page.getByRole('button', {name:'العودة إلى رحلتي'}).click();
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow','2');
});
