import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { arrangeClassroomIdeas, seedClassroom } from './classroom-fixture';
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
      await expect(page.locator('.school-presentation-girl')).toHaveAttribute('src', `/school-entry/platform-${scene.pose.replace('young-', '')}.webp`);
      await expect.poll(() => page.locator('.school-presentation-girl').evaluate(el => (el as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
      const layout = await page.evaluate(() => {
        const el = document.querySelector('.school-classroom-card')!, card = el.getBoundingClientRect();
        const nav = document.querySelector('.school-presentation-nav')!.getBoundingClientRect();
        const girl = document.querySelector('.school-presentation-girl')!.getBoundingClientRect();
        return {fits:card.left >= 0 && card.right <= innerWidth && card.top >= 0 && card.bottom <= innerHeight, readable:el.scrollHeight <= el.clientHeight + 1, clearNav:card.bottom <= nav.top || card.top >= nav.bottom, clearGirl:card.bottom <= girl.top || card.top >= girl.bottom || card.right <= girl.left || card.left >= girl.right};
      });
      expect(layout).toEqual({fits:true,readable:true,clearNav:true,clearGirl:true});
      if (scene.activity === 'order') {
        const cloudLayout = await page.evaluate(() => {
          const cloud = document.querySelector('.school-order-ideas')!.getBoundingClientRect();
          const girl = document.querySelector('.school-presentation-girl')!.getBoundingClientRect();
          const card = document.querySelector('.school-classroom-card')!.getBoundingClientRect();
          return { above: cloud.bottom <= girl.top, onScreen: cloud.left >= 0 && cloud.right <= innerWidth && cloud.top >= 0, clearCard: cloud.right <= card.left || cloud.left >= card.right || cloud.bottom <= card.top || cloud.top >= card.bottom };
        });
        expect(cloudLayout).toEqual({above:true,onScreen:true,clearCard:true});
        if (viewport.width === 390 || viewport.width === 1440) expect((await new AxeBuilder({page}).analyze()).violations).toEqual([]);
        await arrangeClassroomIdeas(page);
      }
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
  await arrangeClassroomIdeas(page);
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
  await expect(page.locator('.school-classroom')).toHaveCSS('background-image', /classroom-approach\.webp/);
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
    await expect(page.locator('.school-presentation-girl')).toBeVisible();
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
    const portraitLayout = viewport.width <= 1000 && viewport.height > viewport.width;
    const expectedScale = portraitLayout ? (viewport.width <= 700 && viewport.height <= 600 ? 2.5 : 1.85) : 1;
    expect(actual.width / entryWidth).toBeCloseTo(expectedScale, 2);
    expect(actual.height / entryHeight).toBeCloseTo(expectedScale, 2);
    expect(actual.foot).toBeCloseTo(.82, 2);
    expect(actual.left).toBeLessThanOrEqual(.05);
    expect(actual.top).toBeLessThanOrEqual(.05);
    expect(actual.right).toBeGreaterThanOrEqual(viewport.width - .05);
    expect(actual.bottom).toBeGreaterThanOrEqual(viewport.height - .05);
  });
}

test('the close-up actually enlarges classroom landmarks rather than switching to a wider view', async ({page}) => {
  await page.goto('/#/map');
  const widths = await page.evaluate(async () => {
    const widthOfBoard = async (src:string) => {
      const img = new Image(); img.src = src; await img.decode();
      const canvas = document.createElement('canvas'); canvas.width = 1376; canvas.height = 768;
      const ctx = canvas.getContext('2d')!; ctx.drawImage(img,0,0,canvas.width,canvas.height);
      const row = ctx.getImageData(0,200,canvas.width,1).data;
      let width = 0;
      for (let x = 0; x < canvas.width; x++) {
        const r = row[x*4], g = row[x*4+1], b = row[x*4+2];
        if (r > 35 && r < 130 && g > r*1.12 && g > b*1.1 && g > 40 && g < 165) width++;
      }
      return width;
    };
    return Promise.all([widthOfBoard('/school-entry/classroom.webp'), widthOfBoard('/school-entry/classroom-stage-zoom.webp')]);
  });
  expect(widths[0]).toBeGreaterThan(300);
  expect(widths[1] / widths[0]).toBeGreaterThan(2.6);
});

test('a failed close-up can be retried without displaying the girl over a blank background', async ({page}) => {
  let requests = 0;
  await page.route('**/school-entry/classroom-stage-zoom.webp*', async route => {
    requests++;
    if (requests === 1) await route.abort(); else await route.continue();
  });
  await seedClassroom(page, 1);
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.goto('/#/lesson/2');
  await page.keyboard.press('End');
  await page.getByRole('button', {name:'الدخول إلى القسم'}).click();
  await expect(page.getByRole('alert')).toContainText('تعذّر تحميل مشهد المنصّة');
  await expect(page.locator('.school-presentation-girl')).toHaveCount(0);
  await page.getByRole('button', {name:'إعادة المحاولة'}).click();
  await expect(page.locator('.school-presentation-girl')).toBeVisible();
  await expect(page.getByRole('alert')).toHaveCount(0);
});

test('both close-ups preserve the classroom pupils and desks as exact crops', async ({page}) => {
  await page.goto('/#/map');
  const errors = await page.evaluate(async () => {
    const load = async (src:string) => { const img = new Image(); img.src = src; await img.decode(); return img; };
    const [wide, middle, close] = await Promise.all(['/school-entry/classroom.webp', '/school-entry/classroom-approach.webp', '/school-entry/classroom-stage-zoom.webp'].map(load));
    const canvas = document.createElement('canvas'); canvas.width = 240; canvas.height = 134;
    const ctx = canvas.getContext('2d')!; ctx.imageSmoothingQuality = 'high';
    const difference = (zoom:HTMLImageElement, crop:[number,number,number,number]) => {
      ctx.clearRect(0,0,canvas.width,canvas.height);
      ctx.drawImage(wide,...crop,0,0,canvas.width,canvas.height);
      const original = ctx.getImageData(0,0,canvas.width,canvas.height).data;
      ctx.clearRect(0,0,canvas.width,canvas.height);
      ctx.drawImage(zoom,0,0,canvas.width,canvas.height);
      const result = ctx.getImageData(0,0,canvas.width,canvas.height).data;
      let error = 0;
      for (let i = 0; i < original.length; i += 4) for (let c = 0; c < 3; c++) error += Math.abs(original[i+c] - result[i+c]);
      return error / (canvas.width * canvas.height * 3);
    };
    return [difference(middle,[556,180,1640,916]), difference(close,[906,410,940,524])];
  });
  expect(errors[0]).toBeLessThan(10);
  expect(errors[1]).toBeLessThan(10);
});


test('the learner arranges the ideas above the girl before the presentation continues', async ({page}) => {
  await seedClassroom(page, 1);
  await page.goto('/#/lesson/2');
  await page.keyboard.press('End'); await page.getByRole('button', {name:'الدخول إلى القسم'}).click();
  await page.keyboard.press('End');
  await expect(page.getByRole('heading', {name:'نرتّب أفكاري معًا'})).toBeFocused();
  const cloud = page.getByRole('region', {name:'ترتيب أفكار مريم'});
  await expect(page.getByRole('button', {name:'التالي', exact:true})).toBeDisabled();
  await cloud.getByRole('button', {name:'أختم بلطف'}).click();
  await expect(cloud.getByRole('status')).toContainText('جرّبوا مرة أخرى');
  await expect(cloud.getByRole('button', {name:'أختم بلطف'})).toBeEnabled();
  await arrangeClassroomIdeas(page);
  await expect(cloud.getByRole('status')).toContainText('رتّبنا أفكار مريم');
  await expect(cloud.locator('button')).toHaveText(['1 · التحية واسمي', '2 · عمري ومدرستي وصفّي', '3 · ما أحبّه وهوايتي', '4 · أختم بلطف']);
  await expect(page.getByRole('button', {name:'التالي', exact:true})).toBeEnabled();
  await page.getByRole('button', {name:'التالي', exact:true}).click();
  await expect(page.getByRole('heading', {name:'أبدأ بالتحية'})).toBeFocused();
  await page.getByRole('button', {name:'السابق'}).click();
  await expect(cloud.getByRole('status')).toContainText('رتّبنا أفكار مريم');
});


test('every classroom pose uses a consistent transparent platform illustration', async ({page}) => {
  await page.goto('/#/map');
  const results = await page.evaluate(async (poses) => Promise.all(poses.map(async pose => {
    const image = new Image(); image.src = `/school-entry/platform-${pose.replace('young-', '')}.webp`; await image.decode();
    const canvas = document.createElement('canvas'); canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
    const context = canvas.getContext('2d')!; context.drawImage(image,0,0);
    return {width:image.naturalWidth, height:image.naturalHeight, cornerAlpha:context.getImageData(0,0,1,1).data[3]};
  })), [...new Set(CLASSROOM_PRESENTATION.map(scene => scene.pose))]);
  expect(results).toHaveLength(7);
  for (const result of results) expect(result).toEqual({width:752, height:1416, cornerAlpha:0});
});
