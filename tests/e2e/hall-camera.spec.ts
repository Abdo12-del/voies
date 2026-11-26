import { expect, test } from '@playwright/test';
import { seedClassroom } from './classroom-fixture';

for (const viewport of [{width:2560,height:600}, {width:1920,height:540}, {width:1800,height:600}, {width:1799,height:600}, {width:1568,height:724}, {width:1440,height:900}, {width:820,height:1180}, {width:390,height:844}, {width:320,height:568}, {width:844,height:390}]) {
  test(`the camera pans across one fixed hallway at ${viewport.width}x${viewport.height}`, async ({page}) => {
    await page.setViewportSize(viewport);
    await page.emulateMedia({reducedMotion:'reduce'});
    await seedClassroom(page, 1);
    await page.goto('/#/lesson/2');
    await expect(page.getByRole('heading', {name:'لقاء في الممر'})).toBeFocused();
    const world = page.locator('.school-hall-world');
    const people = page.locator('.school-hall-people');
    const friend = page.locator('[data-speaker="friend"]');
    const young = page.locator('[data-speaker="young"]');
    await expect(friend).toHaveClass(/is-active/);
    await expect(friend).toHaveCSS('visibility', 'visible');
    await expect(young).toHaveCSS('visibility', 'visible');
    const expectPairInFrame = async () => {
      const bounds = await page.evaluate(() => {
        const card = document.querySelector('.sisters-card')!.getBoundingClientRect();
        return [...document.querySelectorAll('.school-figures')].map(el => {
          const r = el.getBoundingClientRect();
          return {inFrame:r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= innerHeight,
            clearCard:r.bottom <= card.top || r.top >= card.bottom || r.right <= card.left || r.left >= card.right};
        });
      });
      expect(bounds).toEqual([{inFrame:true, clearCard:true}, {inFrame:true, clearCard:true}]);
    };
    await expect(friend).toHaveAttribute('data-facing', 'partner');
    await expect(young).toHaveAttribute('data-facing', 'partner');
    await expectPairInFrame();
    const expectSpeakerInFrame = async () => {
      const bounds = await page.locator('.school-figures.is-active').evaluate(el => {
        const r = el.getBoundingClientRect();
        return {left:r.left, right:r.right, top:r.top, bottom:r.bottom, width:innerWidth, height:innerHeight};
      });
      expect(bounds.left).toBeGreaterThanOrEqual(0);
      expect(bounds.right).toBeLessThanOrEqual(bounds.width);
      expect(bounds.top).toBeGreaterThanOrEqual(0);
      expect(bounds.bottom).toBeLessThanOrEqual(bounds.height);
    };
    await expectSpeakerInFrame();
    await expect(world).toHaveCSS('transition-duration', '0s');
    await expect(world).toHaveCSS('background-image', /hall\.webp/);
    await page.waitForTimeout(100);
    const before = await page.evaluate(() => {
      const world = document.querySelector<HTMLElement>('.school-hall-world')!;
      const people = document.querySelector<HTMLElement>('.school-hall-people')!;
      const f = document.querySelector<HTMLElement>('[data-speaker="friend"]')!;
      const y = document.querySelector<HTMLElement>('[data-speaker="young"]')!;
      return { camera:getComputedStyle(world).transform, figures:getComputedStyle(people).transform, friendX:f.offsetLeft, youngX:y.offsetLeft, friendY:f.offsetTop, youngY:y.offsetTop, width:people.offsetWidth };
    });
    expect(before.camera).toBe(before.figures);
    expect(before.youngX).toBeGreaterThan(before.friendX);
    // The hallway's reference pupils have heads around y=374 and feet y=570
    // in the 768px source. Both speakers are same-age and stand on the same
    // nearer floor line, so their heights share that projected head line.
    const proportions = await page.evaluate(() => {
      const world = document.querySelector<HTMLElement>('.school-hall-world')!.getBoundingClientRect();
      const friend = document.querySelector<HTMLElement>('[data-speaker="friend"]')!.getBoundingClientRect();
      const young = document.querySelector<HTMLElement>('[data-speaker="young"]')!.getBoundingClientRect();
      return { referenceHead:world.top + world.height * 374 / 768, referenceFoot:world.top + world.height * 570 / 768,
        friendTop:friend.top, youngTop:young.top, friendFoot:friend.bottom, youngFoot:young.bottom, friendHeight:friend.height, youngHeight:young.height, gap:young.left - friend.right };
    });
    expect(Math.abs(proportions.friendHeight-proportions.youngHeight)).toBeLessThan(1);
    expect(Math.abs(proportions.friendTop-proportions.youngTop)).toBeLessThan(1);
    expect(Math.abs(proportions.friendFoot-proportions.youngFoot)).toBeLessThan(1);
    expect(Math.abs(proportions.friendTop-proportions.referenceHead)).toBeLessThan(1);
    expect(proportions.friendFoot).toBeGreaterThan(proportions.referenceFoot);
    // Their speaking distance remains comfortably smaller than their height.
    expect(proportions.gap).toBeGreaterThan(-proportions.friendHeight * .15);
    expect(proportions.gap).toBeLessThan(proportions.friendHeight * .6);
    await page.getByRole('button', {name:'التالي',exact:true}).click();
    await expect(page.getByRole('heading', {name:'ماذا لو نسيت؟'})).toBeFocused();
    await expect(young).toHaveClass(/is-active/);
    await expect(young).toHaveCSS('visibility', 'visible');
    await expect(friend).toHaveCSS('visibility', 'visible');
    await expect(friend).toHaveAttribute('data-facing', 'partner');
    await expect(young).toHaveAttribute('data-facing', 'partner');
    await expectSpeakerInFrame();
    await expectPairInFrame();
    const after = await page.evaluate(() => {
      const world = document.querySelector<HTMLElement>('.school-hall-world')!;
      const people = document.querySelector<HTMLElement>('.school-hall-people')!;
      const f = document.querySelector<HTMLElement>('[data-speaker="friend"]')!;
      const y = document.querySelector<HTMLElement>('[data-speaker="young"]')!;
      return { camera:getComputedStyle(world).transform, figures:getComputedStyle(people).transform, friendX:f.offsetLeft, youngX:y.offsetLeft, friendY:f.offsetTop, youngY:y.offsetTop, width:people.offsetWidth };
    });
    expect(after.camera).not.toBe(before.camera);
    expect(after.camera).toBe(after.figures);
    expect([after.friendX, after.youngX, after.friendY, after.youngY, after.width]).toEqual([before.friendX, before.youngX, before.friendY, before.youngY, before.width]);
    await page.getByRole('button', {name:'السابق',exact:true}).click();
    await expect(world).toHaveCSS('transform', before.camera);
    await expect(friend).toHaveCSS('visibility', 'visible');
    await expect(young).toHaveCSS('visibility', 'visible');
  });
}

test('animated camera pans without changing fixed positions, and stays put for the same speaker', async ({page}) => {
  await page.setViewportSize({width:1440,height:900});
  await page.emulateMedia({reducedMotion:'no-preference'});
  await seedClassroom(page, 1);
  await page.goto('/#/lesson/2');
  await expect(page.getByRole('heading', {name:'لقاء في الممر'})).toBeFocused();
  await page.waitForTimeout(1400);
  const world = page.locator('.school-hall-world');
  const initial = await world.evaluate(el => getComputedStyle(el).transform);
  const positions = await page.locator('.school-hall-people').evaluate(el => [...el.children].map(child => (child as HTMLElement).offsetLeft));
  await page.getByRole('button', {name:'التالي',exact:true}).click();
  await expect.poll(async () => world.evaluate(el => getComputedStyle(el).transform)).not.toBe(initial);
  await expect(page.locator('.school-hall-people')).toHaveClass(/is-moving/);
  await expect(page.locator('.school-hall-people')).not.toHaveClass(/is-moving/, {timeout:5000});
  await expect(page.locator('[data-speaker="friend"]')).toHaveCSS('visibility', 'visible');
  await expect(page.locator('[data-speaker="young"]')).toHaveCSS('visibility', 'visible');
  expect(await page.locator('.school-hall-people').evaluate(el => [...el.children].map(child => (child as HTMLElement).offsetLeft))).toEqual(positions);
  await page.getByRole('button', {name:'التالي',exact:true}).click();
  await expect(page.locator('.school-hall-people')).not.toHaveClass(/is-moving/, {timeout:5000});
  const friendCamera = await world.evaluate(el => getComputedStyle(el).transform);
  await page.getByRole('button', {name:'التالي',exact:true}).click();
  await expect(page.getByRole('heading', {name:'ما علّمني أبي'})).toBeFocused();
  await expect(world).toHaveCSS('transform', friendCamera);
  await expect(page.locator('.school-hall-people')).not.toHaveClass(/is-moving/);
});

test('navigating away while the camera returns to the hallway cancels entry', async ({page}) => {
  await page.emulateMedia({reducedMotion:'no-preference'});
  await seedClassroom(page,1);
  await page.goto('/#/lesson/2');
  await page.keyboard.press('End');
  await page.getByRole('button', {name:'الدخول إلى القسم'}).click();
  await page.evaluate(() => { window.location.hash = '#/other'; });
  await page.waitForTimeout(1800);
  await expect(page).toHaveURL(/#\/other$/);
  await expect(page.locator('.school-hall')).toHaveCount(0);
});

for (const viewport of [{width:1440,height:900}, {width:844,height:390}]) {
  test(`zooming back aligns precisely with the hallway before classroom entry at ${viewport.width}x${viewport.height}`, async ({page}) => {
    await page.setViewportSize(viewport); await page.emulateMedia({reducedMotion:'no-preference'});
    await seedClassroom(page,1); await page.goto('/#/lesson/2');
    await page.getByRole('heading', {name:'لقاء في الممر'}).waitFor();
    await page.waitForTimeout(1400); await page.keyboard.press('End');
    await page.getByRole('button', {name:'الدخول إلى القسم'}).click();
    const geometry = await page.evaluate(async () => {
      const world = document.querySelector<HTMLElement>('.school-hall-world')!;
      const transition = world.getAnimations().find(animation => animation instanceof CSSTransition);
      if (!transition) throw new Error('missing zoom-out transition');
      transition.pause(); transition.currentTime = 999;
      await new Promise(requestAnimationFrame);
      const r = world.getBoundingClientRect();
      const imageWidth = Math.max(innerWidth, innerHeight * 1376 / 768);
      const imageHeight = imageWidth * 768 / 1376;
      return {left:r.left, top:r.top, width:r.width, height:r.height, expectedLeft:(innerWidth-imageWidth)/2, expectedTop:(innerHeight-imageHeight)/2, expectedWidth:imageWidth, expectedHeight:imageHeight};
    });
    expect(Math.abs(geometry.left-geometry.expectedLeft)).toBeLessThan(1);
    expect(Math.abs(geometry.top-geometry.expectedTop)).toBeLessThan(1);
    expect(Math.abs(geometry.width-geometry.expectedWidth)).toBeLessThan(1);
    expect(Math.abs(geometry.height-geometry.expectedHeight)).toBeLessThan(1);
    await expect(page.getByRole('main', {name:'الدخول إلى القسم'})).toBeVisible({timeout:5000});
  });
}
