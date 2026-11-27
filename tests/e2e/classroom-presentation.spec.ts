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
  await page.keyboard.press('End');
  await expect(page.getByText('هذه مراجعة ولا تغيّر تقدّم الرحلة.')).toBeVisible();
  await expect(page.getByRole('button', {name:/إنهاء الحصة/})).toHaveCount(0);
  await page.getByRole('button', {name:'العودة إلى رحلتي'}).click();
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '2');
});

test('the presentation starts directly with the high-resolution platform illustration', async ({page}) => {
  await seedClassroom(page, 1);
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.goto('/#/lesson/2');
  await page.keyboard.press('End');
  await page.getByRole('button', {name:'الدخول إلى القسم'}).click();
  await expect(page.getByRole('heading', {name:'دوري على المنصّة'})).toBeFocused();
  await expect(page.getByRole('button', {name:'إلى المنصّة'})).toHaveCount(0);
  await expect(page.locator('.school-classroom')).toHaveCSS('background-image', /classroom\.webp/);
  await expect(page.locator('.school-presentation-art')).toHaveCSS('background-image', /classroom-stage-zoom\.webp/);
  await expect(page.getByRole('button', {name:'السابق'})).toBeDisabled();
  const dimensions = await page.evaluate(async () => {
    const img = new Image(); img.src = '/school-entry/classroom-stage-zoom.webp'; await img.decode();
    return [img.naturalWidth, img.naturalHeight];
  });
  expect(dimensions).toEqual([5504, 3072]);
});

test('the view through the hallway doorway is a crop of the same classroom', async ({page}) => {
  await page.goto('/#/map');
  const difference = await page.evaluate(async () => {
    const load = async (src:string) => { const image = new Image(); image.src = src; await image.decode(); return image; };
    const [hall, classroom] = await Promise.all([load('/school-entry/hall.webp'), load('/school-entry/classroom.webp')]);
    const canvas = document.createElement('canvas'); canvas.width = 188; canvas.height = 300;
    const context = canvas.getContext('2d')!;
    context.drawImage(hall, 594*4, 225*4, 188*4, 300*4, 0, 0, 188, 300);
    const actual = context.getImageData(0, 0, 188, 300).data;
    const cropWidth = classroom.naturalHeight * 188 / 300;
    context.drawImage(classroom, (classroom.naturalWidth-cropWidth)/2, 0, cropWidth, classroom.naturalHeight, 0, 0, 188, 300);
    const expected = context.getImageData(0, 0, 188, 300).data;
    let total = 0;
    for (let i=0; i<actual.length; i+=4) for (let channel=0; channel<3; channel++) total += Math.abs(actual[i+channel] - expected[i+channel]);
    return total / (188*300*3);
  });
  expect(difference).toBeLessThan(9);
});

for (const viewport of [{width:1440,height:900}, {width:820,height:1180}, {width:390,height:844}, {width:320,height:568}, {width:844,height:390}, {width:2560,height:600}]) {
  test(`redrawn platform close-up covers the screen at ${viewport.width}x${viewport.height}`, async ({page}) => {
    await page.setViewportSize(viewport);
    await page.emulateMedia({reducedMotion:'no-preference'});
    await seedClassroom(page, 1);
    await page.goto('/#/lesson/2');
    await page.keyboard.press('End');
    await page.getByRole('button', {name:'الدخول إلى القسم'}).click();
    const entry = page.locator('.school-hall-room');
    await expect(entry).toBeAttached();
    const entryImage = await entry.evaluate(el => getComputedStyle(el).backgroundImage);
    await page.getByRole('button', {name:/تخطّي الانتقال/}).click();
    await expect(page.getByRole('heading', {name:'دوري على المنصّة'})).toBeFocused();
    const actual = await page.evaluate(() => {
      const art = document.querySelector<HTMLElement>('.school-presentation-art')!;
      const girl = document.querySelector<HTMLElement>('.school-presentation-girl')!;
      const r = art.getBoundingClientRect(), g = girl.getBoundingClientRect();
      return {image:getComputedStyle(art).backgroundImage, width:r.width, height:r.height, left:r.left, right:r.right, top:r.top, bottom:r.bottom, foot:(g.bottom-r.top)/r.height};
    });
    const entryWidth = Math.max(viewport.width, viewport.height * 43 / 24);
    const entryHeight = Math.max(viewport.height, viewport.width * 24 / 43);
    expect(entryImage).toMatch(/classroom\.webp/);
    expect(actual.image).toMatch(/classroom-stage-zoom\.webp/);
    expect(actual.image).not.toBe(entryImage);
    expect(actual.width / entryWidth).toBeCloseTo(1, 2);
    expect(actual.height / entryHeight).toBeCloseTo(1, 2);
    expect(actual.foot).toBeCloseTo(.54, 2);
    expect(actual.left).toBeLessThanOrEqual(.05);
    expect(actual.top).toBeLessThanOrEqual(.05);
    expect(actual.right).toBeGreaterThanOrEqual(viewport.width - .05);
    expect(actual.bottom).toBeGreaterThanOrEqual(viewport.height - .05);
  });
}
