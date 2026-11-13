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

async function expectCustomArtwork(page: Page, slideNumber: number) {
  const art = page.locator(".lesson-art, .guided-card-artwork");
  const count = slideNumber === 14 ? 3 : 1;
  await expect(art).toHaveCount(count);
  await expect
    .poll(() =>
      art.evaluateAll((images) =>
        images.every((image) => {
          const img = image as HTMLImageElement;
          return img.complete && img.naturalWidth > 0;
        }),
      ),
    )
    .toBe(true);
}

async function openCurrentLesson(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "ابدأ الحصة", exact: true }).click();
  await expect(page.locator(".lesson")).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
}

test("the first lesson follows its 18 timed slides, safe-sharing lesson and closing preview", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await seedClassroom(page, 0);
  await openCurrentLesson(page);
  await expectCustomArtwork(page, 1);
  await expect(counter(page)).toHaveText("1 من 18");
  await expect(page.locator(".phase-badge")).toContainText("10 دقائق");
  await expect(finishButton(page)).toHaveCount(0);

  await next(page).click();
  await expectCustomArtwork(page, 2);
  await expect(
    page.getByRole("heading", {
      name: "مساحة الكلام — ما الذي سنفعله اليوم؟",
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.locator(".guided-card")).toHaveCount(6);
  const a11y = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(
    a11y.violations.map((violation) => ({
      id: violation.id,
      targets: violation.nodes.map((node) => node.target),
    })),
  ).toEqual([]);
  await page.screenshot({ path: "artifacts/screenshots/lesson-1-slide2.png" });

  await page.locator('.slide-dots .dot[aria-label^="الشريحة 6:"]').click();
  await expectCustomArtwork(page, 6);
  await expect(counter(page)).toHaveText("6 من 18");
  await expect(page.locator(".guided-cards")).toContainText("رقم الهاتف");
  await expect(page.locator(".guided-cards")).toContainText("كلمة المرور");

  await page.locator('.slide-dots .dot[aria-label^="الشريحة 11:"]').click();
  await expectCustomArtwork(page, 11);
  await expect(counter(page)).toHaveText("11 من 18");
  await expect(page.locator(".guided-example")).toContainText("مرحبًا! اسمي مريم");
  await expect(page.locator(".guided-card")).toHaveCount(4);
  await page.screenshot({ path: "artifacts/screenshots/lesson-1-slide11.png" });

  await page.locator('.slide-dots .dot[aria-label^="الشريحة 14:"]').click();
  await expectCustomArtwork(page, 14);
  await expect(counter(page)).toHaveText("14 من 18");
  await expect(page.locator(".guided-card")).toHaveCount(3);
  await expect(page.locator(".guided-cards")).toContainText("ليلى");
  await expect(page.locator(".guided-cards")).toContainText("سامي");
  await expect(page.locator(".guided-cards")).toContainText("الأخت الصغيرة");
  await page.screenshot({ path: "artifacts/screenshots/lesson-1-slide14.png" });

  await page.keyboard.press("End");
  await expectCustomArtwork(page, 18);
  await expect(counter(page)).toHaveText("18 من 18");
  await expect(page.getByRole("heading", { name: "إنجازي الأول" })).toBeVisible();
  await expect(page.locator(".lesson-next-preview")).toContainText(
    "في الحصة القادمة",
  );
  await expect(finishButton(page)).toBeVisible();
  await page.screenshot({ path: "artifacts/screenshots/lesson-1-slide18.png" });
});

test("the first lesson stays legible on a phone and uses compact slide controls", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await seedClassroom(page, 0);
  await openCurrentLesson(page);
  const total = 18;
  await expectCustomArtwork(page, 1);
  await expectSingleFittingSlide(page, total);
  await page.screenshot({ path: "artifacts/screenshots/lesson-1-phone-slide1.png" });

  await next(page).click();
  await expectCustomArtwork(page, 2);
  await expect(counter(page)).toHaveText("2 من 18");
  await expectSingleFittingSlide(page, total);
  await page.screenshot({ path: "artifacts/screenshots/lesson-1-phone-slide2.png" });

  for (let slide = 3; slide <= 11; slide++) {
    await next(page).click();
    await expectCustomArtwork(page, slide);
    if (slide === 6)
      await page.screenshot({ path: "artifacts/screenshots/lesson-1-phone-slide6.png" });
  }
  await expect(counter(page)).toHaveText("11 من 18");
  await expectSingleFittingSlide(page, total);
  await page.screenshot({ path: "artifacts/screenshots/lesson-1-phone-slide11.png" });

  for (let slide = 12; slide <= 17; slide++) {
    await next(page).click();
    await expectCustomArtwork(page, slide);
    if (slide === 17) {
      await expectSingleFittingSlide(page, total);
      await page.screenshot({ path: "artifacts/screenshots/lesson-1-phone-slide17.png" });
    }
  }
  await page.keyboard.press("End");
  await expectCustomArtwork(page, 18);
  await expect(counter(page)).toHaveText("18 من 18");
  await expect(finishButton(page)).toBeVisible();
  await expectSingleFittingSlide(page, total);
  await page.screenshot({ path: "artifacts/screenshots/lesson-1-phone-slide18.png" });
});

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
      navBottom: document.querySelector(".slide-nav")!.getBoundingClientRect()
        .bottom,
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
    // حصة 8: نشاط من خطوتين → 5 شرائح: الغلاف، هدفي اليوم، النشاط، التحدي، النهاية
    const total = Number(/من (\d+)/.exec(await counter(page).innerText())![1]);
    expect(total).toBe(5);
    await expect(counter(page)).toHaveText("1 من 5");
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
      if (width === 1440 || width === 390)
        await page.screenshot({
          path: `artifacts/screenshots/lesson-${width}x${height}-slide${i}.png`,
        });
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
  await expect(counter(page)).toHaveText("1 من 5");
  await page.keyboard.press("ArrowLeft");
  await expect(counter(page)).toHaveText("2 من 5");
  await page.keyboard.press("ArrowRight");
  await expect(counter(page)).toHaveText("1 من 5");
  await page.keyboard.press("End");
  await expect(counter(page)).toHaveText("5 من 5");
  await expect(finishButton(page)).toBeVisible();
  await page.keyboard.press("ArrowLeft");
  await expect(counter(page)).toHaveText("5 من 5");
  await page.keyboard.press("Home");
  await expect(counter(page)).toHaveText("1 من 5");
  // النقاط تنقل مباشرة إلى شريحة
  await page
    .getByRole("button", { name: "الشريحة 4: تحدّي المحطة", exact: true })
    .click();
  await expect(counter(page)).toHaveText("4 من 5");
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
  await expect(counter(page)).toHaveText("2 من 5");
  await swipe(70, 320);
  await expect(counter(page)).toHaveText("1 من 5");
  // سحب قصير أو شبه رأسي لا يبدّل الشريحة
  await swipe(300, 260);
  await expect(counter(page)).toHaveText("1 من 5");
  expect(await page.evaluate(() => scrollY)).toBe(0);
  await context.close();
});

test("the wheel stays available mid-deck and closes back onto the same slide", async ({
  page,
}) => {
  await seedClassroom(page, 7, ["ليان", "سامي"]);
  await openCurrentLesson(page);
  await next(page).click();
  await expect(counter(page)).toHaveText("2 من 5");
  await page.getByRole("button", { name: "مَن يتحدث؟", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "مَن يتحدث؟", exact: true }),
  ).toBeFocused();
  await expect(counter(page)).toHaveText("2 من 5");
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
  for (let i = 1; i <= 5; i++) {
    await expect(counter(page)).toHaveText(`${i} من 5`);
    await expect(finishButton(page)).toHaveCount(0);
    if (i < 5) await next(page).click();
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
      expect(
        violations[`${width}-${state}`],
        `${width}×${height} ${state}`,
      ).toEqual([]);
    }
    writeFileSync(
      `artifacts/axe-lesson-${width}.json`,
      JSON.stringify(violations, null, 2),
    );
  }
});

/* كل شرائح الحصص الـ32 تتسع داخل بطاقة الشريحة (البطاقة تقصّ الفائض، فنفحص الحدود). */
for (const [width, height] of [
  [1440, 900],
  [1366, 768],
  [1024, 768],
  [390, 844],
])
  test(`every slide of all 32 sessions fits its card at ${width}×${height}`, async ({
    page,
  }) => {
    test.setTimeout(150000);
    await page.setViewportSize({ width, height });
    await seedClassroom(page, 32);
    const problems: string[] = [];
    for (let id = 1; id <= 32; id++) {
      await page.goto(`/#/lesson/${id}?mode=review`);
      await expect(page.locator(".lesson .slide")).toHaveCount(1);
      await page.evaluate(() => document.fonts.ready);
      const total = Number(
        /من (\d+)/.exec(await counter(page).innerText())![1],
      );
      for (let i = 1; i <= total; i++) {
        await expect(counter(page)).toHaveText(`${i} من ${total}`);
        const issues = await page.evaluate(() => {
          const card = document.querySelector(".lesson .slide")!;
          const c = card.getBoundingClientRect();
          const out: string[] = [];
          if (document.documentElement.scrollHeight > innerHeight)
            out.push("page scrolls");
          for (const el of card.querySelectorAll("*")) {
            if (el.closest(".slide-deco, .end-confetti")) continue;
            const r = el.getBoundingClientRect();
            if (r.width + r.height === 0) continue;
            if (
              r.top < c.top - 1 ||
              r.bottom > c.bottom + 1 ||
              r.left < c.left - 1 ||
              r.right > c.right + 1
            )
              out.push(`${(el as HTMLElement).className || el.tagName}`);
          }
          return out;
        });
        if (issues.length)
          problems.push(`#${id} s${i}: ${issues.slice(0, 3).join(", ")}`);
        if (i < total) await page.keyboard.press("ArrowLeft");
      }
    }
    expect(problems).toEqual([]);
  });

test("slides glide RTL with a staggered reveal and a springy, breathing character", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.setViewportSize({ width: 1440, height: 900 });
  await seedClassroom(page, 7);
  await openCurrentLesson(page);
  await next(page).click();
  // التالية تدخل من اليسار والحالية تغادر يمينًا، بمدة 0.45s
  const motion = await page.evaluate(() => {
    const anim = (el: Element | null) => (el ? getComputedStyle(el) : null);
    const live = anim(document.querySelector(".lesson .slide"))!;
    const ghost = anim(document.querySelector(".slide-frame.is-leaving"));
    const delay = (sel: string) =>
      parseFloat(
        anim(document.querySelector(`.lesson .slide ${sel}`))!.animationDelay,
      ) * 1000;
    return {
      live: [live.animationName, live.animationDuration],
      ghost: ghost && [ghost.animationName, ghost.animationDuration],
      order: [
        delay(".slide-heading"),
        delay(".slide-emblem"),
        delay(".slide-steps li, .slide-body, .slide-goal-text"),
        delay(".figure-pop"),
      ],
      bob:
        anim(document.querySelector(".lesson .slide .figure-bob"))!
          .animationName +
        " " +
        anim(document.querySelector(".lesson .slide .figure-bob"))!
          .animationDuration,
    };
  });
  expect(motion.live).toEqual(["deck-in-next", "0.45s"]);
  expect(motion.ghost).toEqual(["deck-out-next", "0.45s"]);
  // العنوان ← الأيقونة ← النص ← الشخصية بفواصل 80–120ms
  for (let n = 1; n < motion.order.length; n++) {
    const gap = motion.order[n] - motion.order[n - 1];
    expect(gap).toBeGreaterThanOrEqual(80);
    expect(gap).toBeLessThanOrEqual(120);
  }
  expect(motion.bob).toBe("figure-bob 3s");
  // الشريحة المغادرة تختفي بعد الانتقال، وتبقى شريحة واحدة
  await expect(page.locator(".slide-frame.is-leaving")).toHaveCount(0);
  await expect(page.locator(".lesson .slide")).toHaveCount(1);
  // الرجوع: الدخول من اليمين
  await prev(page).click();
  expect(
    await page.evaluate(
      () =>
        getComputedStyle(document.querySelector(".lesson .slide")!)
          .animationName,
    ),
  ).toBe("deck-in-prev");
});

test("prefers-reduced-motion switches every animation off", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await seedClassroom(page, 7);
  await openCurrentLesson(page);
  await page.keyboard.press("End");
  await expect(counter(page)).toHaveText("5 من 5");
  await expect(page.locator(".slide-frame.is-leaving")).toHaveCount(0);
  const running = await page.evaluate(() =>
    [...document.querySelectorAll(".lesson *")]
      .filter((el) => getComputedStyle(el).animationName !== "none")
      .map((el) => (el as HTMLElement).className),
  );
  expect(running).toEqual([]);
  await expect(page.locator(".end-confetti")).toBeHidden();
});
