import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { seedClassroom } from "./classroom-fixture";

mkdirSync("artifacts/screenshots", { recursive: true });

const next = (page: Page) =>
  page.getByRole("button", { name: "التالي", exact: true });
const prev = (page: Page) =>
  page.getByRole("button", { name: "السابق", exact: true });
const finishButton = (page: Page) =>
  page.getByRole("button", { name: "إنهاء الحصة", exact: true });
const counter = (page: Page) => page.locator(".slide-counter bdi");

async function openCurrentLesson(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "ابدأ الحصة", exact: true }).click();
  await expect(page.locator(".lesson")).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
}

/** شريحة واحدة مرئية، الصفحة لا تتمرر رأسيًا، ولا عنصر مقصوص خارج الشاشة. */
async function expectSingleFittingSlide(page: Page, total: number) {
  await expect(page.locator(".lesson .slide")).toHaveCount(1);
  const geometry = await page.evaluate(() => {
    const vw = innerWidth,
      vh = innerHeight;
    const lesson = document.querySelector(".lesson")!;
    const clipped: string[] = [];
    for (const el of document.querySelectorAll(
      ".lesson .slide, .lesson .slide *, .slide-nav, .slide-nav *, .lesson-float, .lesson-float *",
    )) {
      const r = el.getBoundingClientRect();
      if ((r.width < 2 && r.height < 2) || r.width + r.height === 0) continue;
      if (r.left < -1 || r.right > vw + 1 || r.top < -1 || r.bottom > vh + 1)
        clipped.push((el as HTMLElement).className || el.tagName);
    }
    return {
      documentOverflow:
        document.documentElement.scrollHeight > vh ||
        document.body.scrollHeight > vh,
      lessonOverflow:
        lesson.scrollHeight > lesson.clientHeight + 1 ||
        lesson.scrollWidth > lesson.clientWidth + 1,
      clipped,
      slideTop: document.querySelector(".slide")!.getBoundingClientRect().top,
      navBottom: document
        .querySelector(".slide-nav")!
        .getBoundingClientRect().bottom,
    };
  });
  expect(geometry.documentOverflow, "الصفحة لا تتمرر رأسيًا").toBe(false);
  expect(geometry.lessonOverflow, "الحصة لا تتمرر داخليًا").toBe(false);
  expect(geometry.clipped, "لا عناصر مقصوصة").toEqual([]);
  expect(geometry.navBottom).toBeLessThanOrEqual(
    (await page.evaluate(() => innerHeight)) + 1,
  );
  await expect(page.locator(".slide-dots .dot")).toHaveCount(total);
}

/* على الحاسوب واللوحي والهاتف: شريحة واحدة تملأ الشاشة وتسير حتى النهاية */
for (const [width, height] of [
  [1440, 900],
  [1024, 768],
  [820, 1180],
  [390, 844],
])
  test(`slide deck fits ${width}×${height} and walks to the end`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height });
    await seedClassroom(page, 7);
    await openCurrentLesson(page);
    // حصة 8: نشاط من خطوتين → 4 شرائح: العنوان والهدف، النشاط، التحدي، النهاية
    const total = Number(/من (\d+)/.exec(await counter(page).innerText())![1]);
    expect(total).toBe(4);
    await expect(counter(page)).toHaveText("1 من 4");
    await expect(prev(page)).toBeDisabled();
    await expect(finishButton(page)).toHaveCount(0);
    await expectSingleFittingSlide(page, total);
    if (width === 1440 || width === 390)
      await page.screenshot({
        path: `artifacts/screenshots/lesson-${width}x${height}-slide1.png`,
      });
    for (let i = 2; i <= total; i++) {
      await next(page).click();
      await expect(counter(page)).toHaveText(`${i} من ${total}`);
      await expect(page.locator(".lesson .slide")).toHaveCount(1);
      await expectSingleFittingSlide(page, total);
      // إنهاء الحصة لا يظهر إلا في شريحة النهاية
      await expect(finishButton(page)).toHaveCount(i === total ? 1 : 0);
    }
    await expect(next(page)).toBeDisabled();
    await expect(page.locator(".lesson-approval-note")).toBeVisible();
    if (width === 1440 || width === 390)
      await page.screenshot({
        path: `artifacts/screenshots/lesson-${width}x${height}-end.png`,
      });
    await finishButton(page).click();
    await expect(page.getByRole("progressbar")).toHaveAttribute(
      "aria-valuenow",
      "8",
    );
  });

test("RTL keyboard: left arrow advances, right arrow returns, Home/End jump; browsing never completes", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await seedClassroom(page, 7);
  await openCurrentLesson(page);
  await expect(counter(page)).toHaveText("1 من 4");
  await page.keyboard.press("ArrowLeft");
  await expect(counter(page)).toHaveText("2 من 4");
  await page.keyboard.press("ArrowRight");
  await expect(counter(page)).toHaveText("1 من 4");
  await page.keyboard.press("End");
  await expect(counter(page)).toHaveText("4 من 4");
  await expect(finishButton(page)).toBeVisible();
  await page.keyboard.press("ArrowLeft");
  await expect(counter(page)).toHaveText("4 من 4");
  await page.keyboard.press("Home");
  await expect(counter(page)).toHaveText("1 من 4");
  // النقاط تنقل مباشرة إلى شريحة
  await page
    .getByRole("button", { name: "الشريحة 3: تحدّي المحطة", exact: true })
    .click();
  await expect(counter(page)).toHaveText("3 من 4");
  // التجوّل الكامل في الشرائح ثم العودة لا يغيّر التقدّم
  await page.locator(".lesson-float-start .lesson-chip").click();
  await expect(page.getByRole("progressbar")).toHaveAttribute(
    "aria-valuenow",
    "7",
  );
});

test("horizontal swipe navigates on a phone without any vertical scroll", async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });
  const page = await context.newPage();
  await seedClassroom(page, 7);
  await openCurrentLesson(page);
  const cdp = await context.newCDPSession(page);
  const swipe = async (fromX: number, toX: number) => {
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x: fromX, y: 430 }],
    });
    for (const x of [fromX, (fromX + toX) / 2, toX])
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [{ x, y: 430 }],
      });
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
  };
  // RTL: السحب نحو اليسار يقدّم الشريحة، ونحو اليمين يعيدها
  await swipe(320, 70);
  await expect(counter(page)).toHaveText("2 من 4");
  await swipe(70, 320);
  await expect(counter(page)).toHaveText("1 من 4");
  // سحب قصير أو شبه رأسي لا يبدّل الشريحة
  await swipe(300, 260);
  await expect(counter(page)).toHaveText("1 من 4");
  expect(await page.evaluate(() => scrollY)).toBe(0);
  await context.close();
});

test("the wheel stays available mid-deck and closes back onto the same slide", async ({
  page,
}) => {
  await seedClassroom(page, 7, ["ليان", "سامي"]);
  await openCurrentLesson(page);
  await next(page).click();
  await expect(counter(page)).toHaveText("2 من 4");
  await page.getByRole("button", { name: "مَن يتحدث؟", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "مَن يتحدث؟", exact: true }),
  ).toBeFocused();
  await expect(counter(page)).toHaveText("2 من 4");
  await expect(page.locator(".lesson")).toBeVisible();
});

test("review mode never offers completion and never changes progress", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1024, height: 768 });
  await seedClassroom(page, 7);
  await page.goto("/#/lesson/4?mode=review");
  await expect(page.locator(".lesson")).toBeVisible();
  await expect(page.locator(".lesson-float-mode")).toContainText(
    "وضع المراجعة",
  );
  for (let i = 1; i <= 4; i++) {
    await expect(counter(page)).toHaveText(`${i} من 4`);
    await expect(finishButton(page)).toHaveCount(0);
    if (i < 4) await next(page).click();
  }
  await expect(page.locator(".lesson-approval-note")).toContainText(
    "المراجعة لا تغيّر تقدّم الرحلة",
  );
  await page.locator(".slide-end-actions .btn-primary").click();
  await expect(page.getByRole("progressbar")).toHaveAttribute(
    "aria-valuenow",
    "7",
  );
});

test("slide deck passes wcag checks on desktop and phone", async ({ page }) => {
  test.setTimeout(90000);
  for (const [width, height] of [
    [1440, 900],
    [390, 844],
  ]) {
    await page.setViewportSize({ width, height });
    await seedClassroom(page, 7);
    await openCurrentLesson(page);
    const violations: Record<string, unknown> = {};
    for (const [state, atEnd] of [
      ["title", false],
      ["end", true],
    ] as const) {
      if (atEnd) await page.keyboard.press("End");
      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze();
      violations[`${width}-${state}`] = results.violations.map((v) => ({
        id: v.id,
        nodes: v.nodes.map((n) => n.target),
      }));
      expect(violations[`${width}-${state}`], `${width}×${height} ${state}`).toEqual([]);
    }
    writeFileSync(
      `artifacts/axe-lesson-${width}.json`,
      JSON.stringify(violations, null, 2),
    );
  }
});
