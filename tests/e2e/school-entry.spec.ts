import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { seedClassroom } from './classroom-fixture';

async function finishConversation(page: Page) {
  for (let i = 0; i < 3; i++) await page.getByRole('button', { name:'التالي', exact:true }).click();
  await expect(page.getByText('شكرًا يا سارة! هيا ندخل إلى القسم معًا.')).toBeVisible();
}

for (const viewport of [{width:1440,height:900}, {width:390,height:844}, {width:320,height:568}, {width:844,height:390}]) {
  test(`entry stops for the hallway conversation at ${viewport.width}x${viewport.height}`, async ({page}) => {
    await page.setViewportSize(viewport);
    await page.emulateMedia({reducedMotion:'no-preference'});
    await seedClassroom(page, 1);
    await page.goto('/#/map');
    await page.locator('.current-start').click();
    const entry = page.getByRole('main', {name:'الدخول إلى المدرسة'});
    await expect(entry).toBeVisible();
    await expect(page.locator('.city-app')).toHaveAttribute('inert', '');
    await expect(page.getByRole('button', {name:/تخطّي الانتقال/})).toBeFocused();
    await expect(page.getByRole('heading', {name:'لقاء في الممر'})).toBeFocused({timeout:12000});
    await expect(page).toHaveURL(/#\/map$/);
    await expect(page.locator('.school-hall-background')).toHaveCSS('background-image', /hall\.webp/);
    await expect(page.locator('.school-hall-characters img')).toHaveCount(2);
    for (const img of await page.locator('.school-hall-characters img').all()) {
      await expect.poll(() => img.evaluate(el => (el as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
      const box = await img.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.y + box!.height).toBeGreaterThan(viewport.height * .95);
    }
    const card = await page.locator('.school-hall-card').evaluate(el => {
      const r = el.getBoundingClientRect();
      return {fits:r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= innerHeight, readable:el.scrollHeight <= el.clientHeight + 1};
    });
    expect(card).toEqual({fits:true,readable:true});
    await expect(page.locator('.school-hall-card')).toHaveCSS('opacity', '1');
    expect((await new AxeBuilder({page}).analyze()).violations).toEqual([]);
    await expect(page.getByText('صباح الخير! أنا سارة. هل أنتِ في صفّنا؟')).toBeVisible();
    await page.getByRole('button', {name:'التالي', exact:true}).click();
    await expect(page.getByText('صباح النور! نعم، أنا سعيدة بلقائك، لكنني متوترة قليلًا.')).toBeVisible();
    await page.getByRole('button', {name:'السابق', exact:true}).click();
    await expect(page.getByText('صباح الخير! أنا سارة. هل أنتِ في صفّنا؟')).toBeVisible();
    await finishConversation(page);
    await expect(page.getByRole('button', {name:'الدخول إلى القسم'})).toBeVisible();
    const cardBox = await page.locator('.school-hall-card').boundingBox();
    const figuresBox = await page.locator('.school-hall-characters').boundingBox();
    expect(cardBox && figuresBox && (cardBox.y + cardBox.height <= figuresBox.y || cardBox.x + cardBox.width <= figuresBox.x || figuresBox.x + figuresBox.width <= cardBox.x)).toBeTruthy();
    await page.getByRole('button', {name:'الدخول إلى القسم'}).click();
    await expect(page.getByRole('heading', {name:'وصلنا إلى صفّنا!'})).toBeFocused({timeout:12000});
    await expect(page).toHaveURL(/#\/lesson\/2$/);
    await expect(page.locator('.school-classroom-card')).toHaveCSS('animation-name', 'school-elements-in');
    await expect(page.locator('.school-classroom-card')).toHaveCSS('opacity', '1');
    expect((await new AxeBuilder({page}).analyze()).violations).toEqual([]);
  });
}

test('both handoffs keep the same background in place without a map flash', async ({page}) => {
  await seedClassroom(page, 1);
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.goto('/#/map');
  await page.locator('.current-start').click();
  const watch = (oldSelector: string, nextSelector: string) => page.evaluate(({oldSelector, nextSelector}) => new Promise<{gap:boolean; frame:string | null}>(resolve => {
    let tracking = false, gap = false, frame: string | null = null;
    const started = performance.now();
    const tick = () => {
      const old = document.querySelector(oldSelector), next = document.querySelector(nextSelector);
      if (!tracking && old && Number(getComputedStyle(old).opacity) >= .999) { tracking = true; frame = getComputedStyle(old).backgroundImage; }
      if (tracking && !next && (!old || Number(getComputedStyle(old).opacity) < .99)) gap = true;
      if (next) resolve({gap:gap || !tracking,frame});
      else if (performance.now() - started > 15000) resolve({gap:true,frame});
      else requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }), {oldSelector, nextSelector});
  const hall = await watch('.school-entry-hall', '.school-hall-background');
  expect(hall.gap).toBe(false);
  expect(await page.locator('.school-hall-background').evaluate(el => getComputedStyle(el).backgroundImage)).toEqual(hall.frame);
  await finishConversation(page);
  await page.getByRole('button', {name:'الدخول إلى القسم'}).click();
  const classroom = await watch('.school-hall-room', '.school-classroom');
  expect(classroom.gap).toBe(false);
  expect(await page.locator('.school-classroom').evaluate(el => getComputedStyle(el).backgroundImage)).toEqual(classroom.frame);
});

test('the hallway holds its scene and dialogue until the learner continues', async ({page}) => {
  await seedClassroom(page, 1);
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.goto('/#/map');
  await page.locator('.current-start').click();
  await page.getByRole('button', {name:/تخطّي الانتقال/}).click();
  const hallway = page.getByRole('main', {name:'لقاء الصديقتين في ممر المدرسة'});
  await expect(hallway).toBeVisible();
  await page.waitForTimeout(11000);
  await expect(page).toHaveURL(/#\/map$/);
  await expect(page.getByText('صباح الخير! أنا سارة. هل أنتِ في صفّنا؟')).toBeVisible();
  await expect(page.getByRole('heading', {name:'وصلنا إلى صفّنا!'})).toHaveCount(0);
  await page.getByRole('button', {name:'العودة إلى رحلتي'}).click();
  await expect(hallway).toHaveCount(0);
  await expect(page.locator('.city-app')).not.toHaveAttribute('inert', '');
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '1');
});

test('reduced motion keeps the interactive conversation and enters the classroom without animation', async ({page}) => {
  await seedClassroom(page, 1);
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.goto('/#/map');
  await page.locator('.current-start').click();
  await expect(page.locator('.school-entry')).toHaveCount(0);
  await expect(page.getByRole('heading', {name:'لقاء في الممر'})).toBeFocused();
  await expect(page.locator('.school-hall-card')).toHaveCSS('animation-name', 'none');
  await finishConversation(page);
  await page.getByRole('button', {name:'الدخول إلى القسم'}).click();
  await expect(page.getByRole('heading', {name:'وصلنا إلى صفّنا!'})).toBeFocused();
  await expect(page.locator('.school-classroom-card')).toHaveCSS('animation-name', 'none');
  await page.getByRole('button', {name:'متابعة الحصة'}).click();
  await expect(page.getByRole('main', {name:'الحصة 2: صوتي يصل'})).toBeVisible();
});

test('review visits the same hallway and preserves progress', async ({page}) => {
  await seedClassroom(page, 2);
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.goto('/#/map');
  await page.locator('[data-station-button="2"]').click();
  await page.getByRole('button', {name:'مراجعة الحصة'}).click();
  await page.getByRole('button', {name:/تخطّي الانتقال/}).click();
  await finishConversation(page);
  await page.getByRole('button', {name:'الدخول إلى القسم'}).click();
  await expect(page).toHaveURL(/#\/lesson\/2\?mode=review$/, {timeout:12000});
  await expect(page.getByText(/وضع المراجعة/)).toBeVisible();
  await page.getByRole('button', {name:'العودة إلى رحلتي'}).click();
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '2');
});

test('navigation away cancels a pending school entry', async ({page}) => {
  await seedClassroom(page, 1);
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.goto('/#/map');
  await page.locator('.current-start').click();
  await expect(page.locator('.school-entry')).toBeVisible();
  await page.evaluate(() => { window.location.hash = '#/other'; });
  await expect(page.locator('.school-entry')).toHaveCount(0);
  await page.waitForTimeout(5200);
  await expect(page).toHaveURL(/#\/other$/);
});

test('the school exterior is the very same artwork as the map', async ({page}) => {
  await page.goto('/#/map');
  const identical = await page.evaluate(async () => {
    const load = async (src: string) => { const image = new Image(); image.src = src; await image.decode(); return image; };
    const [map, exterior] = await Promise.all([load('/city/city-map.webp'), load('/school-entry/exterior.webp')]);
    if (exterior.naturalWidth !== 540 || exterior.naturalHeight !== 304) return false;
    const canvas = document.createElement('canvas'); canvas.width = 540; canvas.height = 304;
    const context = canvas.getContext('2d')!;
    context.drawImage(map, 310, 40, 540, 304, 0, 0, 540, 304);
    const original = context.getImageData(0, 0, 540, 304).data;
    context.clearRect(0, 0, 540, 304);
    context.drawImage(exterior, 0, 0);
    const cropped = context.getImageData(0, 0, 540, 304).data;
    return original.every((value, index) => Math.abs(value - cropped[index]) <= 3);
  });
  expect(identical).toBe(true);
});

test('lesson two is still locked until the first is complete', async ({page}) => {
  await seedClassroom(page);
  await page.goto('/#/lesson/2');
  await expect(page).toHaveURL(/#\/map$/);
  await expect(page.locator('.school-classroom')).toHaveCount(0);
  await expect(page.locator('.school-hall')).toHaveCount(0);
});
