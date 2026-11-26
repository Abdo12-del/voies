import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { seedClassroom } from './classroom-fixture';

const viewports = [{width:1440,height:900}, {width:820,height:1180}, {width:390,height:844}, {width:320,height:568}, {width:844,height:390}];
for (const viewport of viewports) {
  test(`breathing and ideas are legible and return to the hallway at ${viewport.width}x${viewport.height}`, async ({page}) => {
    await page.setViewportSize(viewport);
    await page.emulateMedia({reducedMotion:'reduce'});
    await seedClassroom(page,1);
    await page.goto('/#/lesson/2');
    await expect(page.getByRole('heading', {name:'لقاء في الممر'})).toBeFocused();
    const stage = page.locator('.sisters-stage');
    const backdrop = page.locator('.school-teaching-backdrop');
    const next = page.getByRole('button', {name:'التالي',exact:true});
    const checkLayout = async () => {
      const layout = await page.evaluate(() => {
        const rect = (selector:string) => document.querySelector(selector)!.getBoundingClientRect();
        const cue=rect('.school-teaching-cue'), figure=rect('.school-figure-friend'), card=rect('.sisters-card'), nav=rect('.sisters-nav'), top=rect('.sisters-top');
        const separate=(a:DOMRect,b:DOMRect) => a.bottom <= b.top || a.top >= b.bottom || a.right <= b.left || a.left >= b.right;
        return {inside:cue.left >= 0 && cue.right <= innerWidth && cue.top >= 0 && cue.bottom <= innerHeight,
          above:cue.bottom <= figure.top, card:separate(cue,card), top:separate(cue,top), nav:separate(figure,nav)};
      });
      expect(layout).toEqual({inside:true,above:true,card:true,top:true,nav:true});
    };
    for(let i=0;i<5;i++) await next.click();
    await expect(stage).toHaveAttribute('data-visual','breath-ready');
    await expect(backdrop).toHaveCSS('opacity','1');
    await expect(page.locator('.school-figure-friend')).toHaveCSS('transition-duration','0s');
    await checkLayout();
    await next.click();
    await expect(stage).toHaveAttribute('data-visual','inhale');
    await expect(page.locator('.school-breath-mark.is-current')).toContainText('شهيق');
    await expect(page.locator('.school-figure-friend img')).toHaveAttribute('src','/school-lesson/friend-inhale.webp');
    await expect(page.locator('#school-turn-description')).toContainText('شهيق لطيف من الأنف');
    await expect(page.locator('.school-breath-mark.is-current b')).toHaveCSS('animation-name','none');
    await checkLayout();
    if (viewport.width === 390 || viewport.width === 1440) expect((await new AxeBuilder({page}).analyze()).violations).toEqual([]);
    await next.click();
    await expect(stage).toHaveAttribute('data-visual','exhale');
    await expect(page.locator('.school-breath-mark.is-current')).toContainText('زفير');
    await expect(page.locator('.school-figure-friend img')).toHaveAttribute('src','/school-lesson/friend-exhale.webp');
    await checkLayout();
    await next.click();
    await expect(stage).toHaveAttribute('data-visual','breath-practice');
    await next.click();
    await expect(stage).toHaveAttribute('data-visual','scattered');
    await expect(page.locator('.school-teaching-cue')).toContainText('أفكار متزاحمة');
    await checkLayout();
    await next.click();
    await expect(stage).toHaveAttribute('data-visual','ordered');
    await expect(page.locator('.school-teaching-cue')).toContainText('فكرة في كل مرة');
    await expect(page.locator('#school-turn-description')).toContainText('ثم مدرستي');
    await checkLayout();
    await page.getByRole('button', {name:'السابق',exact:true}).click();
    await expect(stage).toHaveAttribute('data-visual','scattered');
    await next.click(); await next.click();
    await expect(page.getByRole('heading', {name:'لحظة هدوء'})).toBeFocused();
    await expect(stage).not.toHaveAttribute('data-visual');
    await expect(backdrop).toHaveCSS('opacity','0');
  });
}

test('the demonstration fades in, moves Sara to center, and fades back out', async ({page}) => {
  await page.setViewportSize({width:1440,height:900});
  await page.emulateMedia({reducedMotion:'no-preference'});
  await seedClassroom(page,1); await page.goto('/#/lesson/2');
  await expect(page.getByRole('heading',{name:'لقاء في الممر'})).toBeFocused();
  const next=page.getByRole('button',{name:'التالي',exact:true});
  for(let i=0;i<4;i++) await next.click();
  await page.waitForTimeout(1100);
  await next.click();
  const backdrop=page.locator('.school-teaching-backdrop');
  await expect(backdrop).toHaveCSS('opacity','1',{timeout:3000});
  const x=await page.locator('.school-figure-friend').evaluate(el => { const r=el.getBoundingClientRect(); return r.left+r.width/2; });
  await expect.poll(async () => page.locator('.school-figure-friend').evaluate(el => { const r=el.getBoundingClientRect(); return r.left+r.width/2; })).toBeCloseTo(720,0);
  expect(x).toBeGreaterThan(0);
  for(let i=0;i<4;i++) await next.click();
  await expect(page.locator('.school-teaching-cue')).toHaveClass(/is-scattered/);
  await page.waitForTimeout(900);
  const word = page.locator('.school-idea-words span').first();
  const scattered = await word.evaluate(el => getComputedStyle(el).transform);
  await next.click();
  await expect(page.locator('.school-teaching-cue')).toHaveClass(/is-ordered/);
  await expect.poll(() => word.evaluate(el => getComputedStyle(el).transform)).not.toBe(scattered);
  await expect(word).toHaveCSS('transform','none',{timeout:3000});
  await next.click();
  await expect(backdrop).toHaveCSS('opacity','0',{timeout:3000});
});
