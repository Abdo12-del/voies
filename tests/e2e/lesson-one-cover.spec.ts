import { expect, test } from '@playwright/test';
import { seedClassroom } from './classroom-fixture';
import { SISTERS_STORY } from '../../src/data/sistersStory';

test('sisters take the learner through the story and speaking activity', async ({page}) => {
  await seedClassroom(page);
  await page.goto('/#/lesson/1');
  await expect(page.getByText(/طلبت مني المعلمة/)).toBeVisible();
  await page.keyboard.press('End');
  await expect(page.getByText(/كل محاولة خطوة جميلة/)).toBeVisible();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByText(/أعرف كيف أبدأ/)).toBeVisible();
  await page.keyboard.press('Home');
  await expect(page.getByRole('heading', {name:'واجب الغد'})).toBeVisible();
  for (let i = 0; i < SISTERS_STORY.findIndex(scene => scene.id === 'listen'); i++) await page.getByRole('button', {name:'التالي', exact:true}).click();
  await expect(page.getByText(/اسأل زميلك/)).toBeVisible();
  await page.getByRole('button', {name:'مَن يتحدث؟'}).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('ArrowLeft');
  await expect(page.getByRole('heading', {name:'نتعرّف ونستمع', includeHidden:true})).toBeAttached();
});
