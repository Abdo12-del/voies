import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { seedClassroom } from './classroom-fixture';

for (const viewport of [{width:1440,height:900}, {width:390,height:844}, {width:320,height:568}, {width:844,height:390}]) {
  test(`arrival and hallway conversation precede the classroom at ${viewport.width}x${viewport.height}`, async ({page}) => {
    test.setTimeout(70000);
    await page.setViewportSize(viewport);
    await page.emulateMedia({reducedMotion:'no-preference'});
    await seedClassroom(page, 1);
    await page.goto('/#/map');
    await page.locator('.current-start').click();
    await expect(page.getByRole('main', {name:'الدخول إلى المدرسة'})).toBeVisible();
    await expect(page.locator('.city-app')).toHaveAttribute('inert', '');
    await expect(page.getByRole('button', {name:/تخطّي الانتقال/})).toBeFocused();
    await expect(page.getByRole('heading', {name:'لقاء في الممر'})).toBeFocused({timeout:15000});
    await expect(page).toHaveURL(/#\/lesson\/2$/);
    const background = page.locator('.school-lesson .sisters-room');
    await expect(background).toHaveCSS('background-image', /hall\.webp/);
    const speaker = page.locator('.school-figures.is-active img');
    await expect(speaker).toHaveCount(1);
    await expect(page.locator('.school-figures img')).toHaveCount(2);
    await expect(speaker).toHaveAttribute('src', '/school-lesson/friend-hall-greet.webp');
    await expect.poll(() => speaker.evaluate(el => (el as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
    await expect(page.locator('.sisters-card')).toHaveCSS('opacity','1');
    expect((await new AxeBuilder({page}).analyze()).violations).toEqual([]);
    await expect(page.getByText('صباح الخير! أنا سارة. هل أنتِ في صفّنا؟')).toBeVisible();
    await page.getByRole('button', {name:'التالي', exact:true}).click();
    await expect(page.getByText('صباح النور! أنا متوترة؛ أخاف أن أنسى ما حفظته حين أتحدث أمام الصف.')).toBeVisible();
    await expect(speaker).toHaveAttribute('src', '/sisters-story/solo/young-worried.webp');
    await page.getByRole('button', {name:'السابق', exact:true}).click();
    await expect(speaker).toHaveAttribute('src', '/school-lesson/friend-hall-greet.webp');
    await page.keyboard.press('End');
    await expect(page.getByRole('heading', {name:'نتقدّم معًا'})).toBeFocused();
    await expect(background).toHaveCSS('background-image', /hall\.webp/);
    await expect(page.locator('.school-classroom')).toHaveCount(0);
    await expect(page.getByRole('button', {name:'الدخول إلى القسم'})).toBeVisible();
    await page.getByRole('button', {name:'الدخول إلى القسم'}).click();
    await expect(page.getByRole('heading', {name:'دوري على المنصّة'})).toBeFocused({timeout:12000});
    await expect(page.locator('.school-classroom-card')).toHaveCSS('opacity', '1');
    expect((await new AxeBuilder({page}).analyze()).violations).toEqual([]);
    await expect(page.getByRole('button', {name:'إلى المنصّة'})).toHaveCount(0);
    await expect(page.locator('.school-presentation-art')).toHaveCSS('background-image', /classroom-stage-zoom\.webp/);
    await expect(page.getByRole('button', {name:/إنهاء الحصة/})).toHaveCount(0);
  });
}

test('the school entrance uses still scenes and can be skipped', async ({page}) => {
  await seedClassroom(page, 1);
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.goto('/#/map');
  await page.locator('.current-start').click();
  await expect(page.locator('.school-entry-doorway svg svg image')).toHaveAttribute('href', '/school-entry/hall.webp');
  await expect(page.locator('.school-entrance-door')).toHaveCount(0);
  await expect(page.locator('.school-entry-closed')).toHaveCSS('background-image', /doors-closed\.webp/);
  await expect(page.locator('.school-entry-ajar')).toHaveCSS('background-image', /doors-ajar\.webp/);
  await expect(page.locator('.school-entry-doorway > svg > image')).toHaveAttribute('href', '/school-entry/doors-open.webp');
  const frames = await page.evaluate(async () => {
    const animations = document.getAnimations(); animations.forEach(animation => animation.pause());
    const seek = async (time:number) => { animations.forEach(animation => { animation.currentTime = time; }); await new Promise(requestAnimationFrame); };
    const style = (selector:string) => { const s = getComputedStyle(document.querySelector<HTMLElement>(selector)!); return {opacity:Number(s.opacity), transform:s.transform}; };
    await seek(1800); const closed = style('.school-entry-closed'), ajarBefore = style('.school-entry-ajar');
    await seek(3300); const ajar = style('.school-entry-ajar'), openBefore = style('.school-entry-doorway');
    await seek(4900); const open = style('.school-entry-doorway'), hallBefore = style('.school-entry-hall');
    await seek(6700); const hall = style('.school-entry-hall');
    return {closed, ajarBefore, ajar, openBefore, open, hallBefore, hall};
  });
  expect(frames.closed).toEqual({opacity:1, transform:'none'});
  expect(frames.ajarBefore.opacity).toBe(0);
  expect(frames.ajar).toEqual({opacity:1, transform:'none'});
  expect(frames.openBefore.opacity).toBe(0);
  expect(frames.open).toEqual({opacity:1, transform:'none'});
  expect(frames.hallBefore.opacity).toBe(0);
  expect(frames.hall.opacity).toBe(1);
  await page.getByRole('button', {name:/تخطّي الانتقال/}).click();
  await expect(page.getByRole('heading', {name:'لقاء في الممر'})).toBeFocused();
});

test('handoffs retain the same backgrounds and never flash the map', async ({page}) => {
  await seedClassroom(page, 1); await page.emulateMedia({reducedMotion:'no-preference'});
  await page.goto('/#/map'); await page.locator('.current-start').click();
  const watch = (oldSelector:string,nextSelector:string) => page.evaluate(({oldSelector,nextSelector}) => new Promise<{gap:boolean;frame:string|null}>(resolve => {
    let tracking = false, gap = false, frame:string|null = null; const started = performance.now();
    const tick = () => {
      const old = document.querySelector(oldSelector), next = document.querySelector(nextSelector);
      if (!tracking && old && Number(getComputedStyle(old).opacity) >= .999) { tracking = true; frame = getComputedStyle(old).backgroundImage; }
      if (tracking && !next && (!old || Number(getComputedStyle(old).opacity) < .99)) gap = true;
      if (next) resolve({gap:gap || !tracking,frame});
      else if (performance.now() - started > 15000) resolve({gap:true,frame}); else requestAnimationFrame(tick);
    }; requestAnimationFrame(tick);
  }), {oldSelector,nextSelector});
  const hall = await watch('.school-entry-hall','.school-lesson');
  expect(hall.gap).toBe(false);
  expect(await page.locator('.school-lesson').evaluate(el => getComputedStyle(el).backgroundImage)).toEqual(hall.frame);
  await page.getByRole('heading', {name:'لقاء في الممر'}).waitFor();
  await page.keyboard.press('End');
  await page.getByRole('button', {name:'الدخول إلى القسم'}).click();
  await expect(page.locator('.lesson-app')).toHaveAttribute('inert', '');
  await expect(page.locator('.school-hall-background')).toHaveCSS('background-image', /hall\.webp/);
  const classroom = await watch('.school-hall-room','.school-classroom');
  expect(classroom.gap).toBe(false);
  expect(await page.locator('.school-classroom').evaluate(el => getComputedStyle(el).backgroundImage)).toEqual(classroom.frame);
});

test('dialogue waits for the learner and reduced motion still visits the hallway', async ({page}) => {
  await seedClassroom(page, 1); await page.emulateMedia({reducedMotion:'reduce'});
  await page.goto('/#/map'); await page.locator('.current-start').click();
  await expect(page.locator('.school-entry')).toHaveCount(0);
  await expect(page.getByRole('heading', {name:'لقاء في الممر'})).toBeFocused();
  await expect(page.locator('.sisters-card')).toHaveCSS('animation-name', 'none');
  await page.waitForTimeout(11000);
  await expect(page.getByRole('heading', {name:'لقاء في الممر'})).toBeVisible();
  await expect(page.getByRole('heading', {name:'دوري على المنصّة'})).toHaveCount(0);
  await page.keyboard.press('End');
  await page.getByRole('button', {name:'الدخول إلى القسم'}).click();
  await expect(page.locator('.school-hall-room')).toHaveCount(0);
  await expect(page.getByRole('heading', {name:'دوري على المنصّة'})).toBeFocused();
  await expect(page.locator('.school-classroom-card')).toHaveCSS('animation-name', 'none');
});

test('review visits the hallway before the class and preserves progress', async ({page}) => {
  await seedClassroom(page, 2); await page.emulateMedia({reducedMotion:'reduce'});
  await page.goto('/#/map'); await page.locator('[data-station-button="2"]').click();
  await page.getByRole('button', {name:'مراجعة الحصة'}).click();
  await expect(page).toHaveURL(/#\/lesson\/2\?mode=review$/);
  await expect(page.getByRole('heading', {name:'لقاء في الممر'})).toBeFocused();
  await page.keyboard.press('End'); await page.getByRole('button', {name:'الدخول إلى القسم'}).click();
  await expect(page.getByRole('heading', {name:'دوري على المنصّة'})).toBeFocused();
  await expect(page.getByText(/وضع المراجعة/)).toBeVisible();
  await page.getByRole('button', {name:'العودة إلى رحلتي'}).click();
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow','2');
});

test('navigation away during classroom entry cancels the transition', async ({page}) => {
  await seedClassroom(page,1); await page.emulateMedia({reducedMotion:'no-preference'});
  await page.goto('/#/lesson/2'); await expect(page.getByRole('heading', {name:'لقاء في الممر'})).toBeFocused();
  await page.keyboard.press('End'); await page.getByRole('button', {name:'الدخول إلى القسم'}).click();
  await expect(page.getByRole('main', {name:'الدخول إلى القسم'})).toBeVisible();
  await page.evaluate(() => {window.location.hash = '#/other';});
  await expect(page.locator('.school-hall')).toHaveCount(0); await page.waitForTimeout(4000);
  await expect(page).toHaveURL(/#\/other$/);
});

test('the school exterior is the very same artwork as the map', async ({page}) => {
  await page.goto('/#/map');
  const identical = await page.evaluate(async () => {
    const load = async (src:string) => { const image = new Image(); image.src = src; await image.decode(); return image; };
    const [map,exterior] = await Promise.all([load('/city/city-map.webp'),load('/school-entry/exterior.webp')]);
    if (exterior.naturalWidth !== 540 || exterior.naturalHeight !== 304) return false;
    const canvas = document.createElement('canvas'); canvas.width = 540; canvas.height = 304; const context = canvas.getContext('2d')!;
    context.drawImage(map,310,40,540,304,0,0,540,304); const original = context.getImageData(0,0,540,304).data;
    context.clearRect(0,0,540,304); context.drawImage(exterior,0,0); const cropped = context.getImageData(0,0,540,304).data;
    return original.every((value,index) => Math.abs(value-cropped[index]) <= 3);
  }); expect(identical).toBe(true);
});

test('lesson two is locked until the first is complete', async ({page}) => {
  await seedClassroom(page); await page.goto('/#/lesson/2');
  await expect(page).toHaveURL(/#\/map$/); await expect(page.locator('.school-lesson')).toHaveCount(0);
});
