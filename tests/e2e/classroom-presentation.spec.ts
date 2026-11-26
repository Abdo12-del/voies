import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { seedClassroom } from './classroom-fixture';
import { CLASSROOM_PRESENTATION } from '../../src/data/classroomPresentation';

for (const viewport of [{width:1440,height:900}, {width:820,height:1180}, {width:390,height:844}, {width:320,height:568}, {width:844,height:390}]) {
  test(`the presentation is readable and complete at ${viewport.width}x${viewport.height}`, async ({page}) => {
    await page.setViewportSize(viewport);
    await page.emulateMedia({reducedMotion:'reduce'});
    await seedClassroom(page, 1);
    await page.goto('/#/lesson/2');
    await page.keyboard.press('End');
    await page.getByRole('button', {name:'الدخول إلى القسم'}).click();
    await page.getByRole('button', {name:'إلى المنصّة'}).click();
    for (const [index, scene] of CLASSROOM_PRESENTATION.entries()) {
      await expect(page.getByRole('heading', {name:scene.title})).toBeFocused();
      await expect(page.locator('.school-presentation-line p')).toHaveText(scene.text);
      await expect(page.locator('.school-presentation-girl')).toHaveAttribute('src', `/sisters-story/solo/${scene.pose}.webp`);
      await expect.poll(() => page.locator('.school-presentation-girl').evaluate(el => (el as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
      const layout = await page.evaluate(() => {
        const el = document.querySelector('.school-classroom-card')!, card = el.getBoundingClientRect();
        const nav = document.querySelector('.school-presentation-nav')!.getBoundingClientRect();
        const girl = document.querySelector('.school-presentation-girl')!.getBoundingClientRect();
        return {fits:card.left >= 0 && card.right <= innerWidth && card.top >= 0 && card.bottom <= innerHeight, readable:el.scrollHeight <= el.clientHeight + 1, clearNav:card.bottom <= nav.top || card.top >= nav.bottom, clearGirl:card.bottom <= girl.top || card.top >= girl.bottom || card.right <= girl.left || card.left >= girl.right};
      });
      expect(layout).toEqual({fits:true,readable:true,clearNav:true,clearGirl:true});
      if (index === 0 && (viewport.width === 390 || viewport.width === 1440)) expect((await new AxeBuilder({page}).analyze()).violations).toEqual([]);
      if (index < CLASSROOM_PRESENTATION.length - 1) {
        await expect(page.getByRole('button', {name:/إنهاء الحصة/})).toHaveCount(0);
        await page.getByRole('button', {name:'التالي',exact:true}).click();
      }
    }
    await expect(page.getByRole('button', {name:/إنهاء الحصة/})).toBeVisible();
  });
}

test('the child applies the lessons before finishing, and review does not advance', async ({page}) => {
  expect(CLASSROOM_PRESENTATION.map(s => s.text).join(' ')).toMatch(/سارة.*أتنفّس/);
  expect(CLASSROOM_PRESENTATION.map(s => s.text).join(' ')).toMatch(/نسيت.*أتوقف وأتنفّس/);
  expect(CLASSROOM_PRESENTATION.map(s => s.text).join(' ')).toMatch(/أختي ليلى/);
  await seedClassroom(page, 2);
  await page.goto('/#/lesson/2?mode=review');
  await page.keyboard.press('End'); await page.getByRole('button', {name:'الدخول إلى القسم'}).click();
  await page.getByRole('button', {name:'إلى المنصّة'}).click();
  await page.keyboard.press('End');
  await expect(page.getByText('هذه مراجعة ولا تغيّر تقدّم الرحلة.')).toBeVisible();
  await expect(page.getByRole('button', {name:/إنهاء الحصة/})).toHaveCount(0);
  await page.getByRole('button', {name:'العودة إلى رحلتي'}).click();
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '2');
});

test('the close-up is decoded at high resolution before the scene appears', async ({page}) => {
  await seedClassroom(page, 1);
  await page.goto('/#/lesson/2');
  await page.keyboard.press('End');
  await page.getByRole('button', {name:'الدخول إلى القسم'}).click();
  await expect(page.getByRole('button', {name:'إلى المنصّة'})).toBeEnabled();
  const dimensions = await page.evaluate(async () => {
    const img = new Image(); img.src = '/school-lesson/classroom-stage.webp'; await img.decode();
    return [img.naturalWidth, img.naturalHeight];
  });
  expect(dimensions).toEqual([3840, 2144]);
  await page.getByRole('button', {name:'إلى المنصّة'}).click();
  await expect(page.locator('.school-presentation-art')).toHaveCSS('background-image', /classroom-stage\.webp/);
  await expect(page.getByRole('heading', {name:'دوري على المنصّة'})).toBeFocused();
});

test('a failed close-up load can be retried without an empty scene', async ({page}) => {
  let requests = 0;
  await page.route('**/school-lesson/classroom-stage.webp', async route => {
    requests++;
    if (requests === 1) await route.abort(); else await route.continue();
  });
  await seedClassroom(page, 1);
  await page.goto('/#/lesson/2');
  await page.keyboard.press('End');
  await page.getByRole('button', {name:'الدخول إلى القسم'}).click();
  await expect(page.getByRole('alert')).toContainText('تعذّر تحميل مشهد المنصّة');
  await expect(page.getByRole('button', {name:'إلى المنصّة'})).toBeDisabled();
  await page.keyboard.press('End');
  await expect(page.getByRole('heading', {name:'وصلنا إلى صفّنا!'})).toBeVisible();
  await expect(page.locator('.school-presentation-art')).toHaveCount(0);
  await page.getByRole('button', {name:'إعادة المحاولة'}).click();
  await expect(page.getByRole('button', {name:'إلى المنصّة'})).toBeEnabled();
  await page.getByRole('button', {name:'إلى المنصّة'}).click();
  await expect(page.getByRole('heading', {name:'دوري على المنصّة'})).toBeFocused();
});
