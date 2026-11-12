import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { seedClassroom } from "./classroom-fixture";

const sizes = [
  [1920, 1080],
  [1440, 900],
  [1366, 768],
  [1024, 768],
  [820, 1180],
  [390, 844],
];
const counts = [0, 7, 16, 20, 32];
mkdirSync("artifacts/screenshots", { recursive: true });

for (const [width, height] of sizes)
  for (const count of counts)
    test(`${width}×${height}, ${count} completed`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await seedClassroom(page, count);
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.goto("/");
      await page.evaluate(() => document.fonts.ready);
      // The award dialog intentionally makes the map/header inert. Include the hidden
      // progressbar while waiting for the saved classroom count, then dismiss the award.
      await expect(
        page.getByRole("progressbar", { includeHidden: true }),
      ).toHaveAttribute("aria-valuenow", String(count));
      await expect(page.locator(".map-loading")).toHaveCount(0);
      if (count === 16 || count === 32) {
        await expect(page.getByRole("dialog")).toBeVisible();
        await page.screenshot({
          path: `artifacts/screenshots/${width}x${height}-${count}-celebration.png`,
        });
        await page
          .getByRole("button", {
            name: count === 16 ? "هيا إلى العالم الثاني" : "أفتخر برحلتي",
            exact: true,
          })
          .click();
        await expect(page.getByRole("dialog")).toHaveCount(0);
      }
      await expect(page.locator(".current-start")).toHaveCount(
        count === 32 ? 0 : 1,
      );
      expect(
        await page
          .getByRole("button", { name: "ابدأ الحصة", exact: true })
          .count(),
      ).toBe(count === 32 ? 0 : 1);
      if (count < 32) {
        await expect(page.locator(`[data-station="${count + 1}"]`)).toHaveClass(
          /is-current/,
        );
        await expect
          .poll(async () => {
            const b = await page
              .locator(`[data-station="${count + 1}"]`)
              .boundingBox();
            return Math.abs(b!.x + b!.width / 2 - width / 2);
          })
          .toBeLessThan(3);
      }
      const geometry = await page.evaluate(() => {
        const map = document.querySelector<HTMLElement>(".map-viewport")!;
        const scene = document
          .querySelector(".map-shell")!
          .getBoundingClientRect();
        const hud = Array.from(
          document.querySelectorAll<HTMLElement>("[data-hud]"),
        ).filter(
          (el) =>
            el.getBoundingClientRect().width &&
            el.getBoundingClientRect().height,
        );
        const boxes = Array.from(
          document.querySelectorAll<HTMLElement>(
            "[data-label],[data-collision],.station,.milestone",
          ),
        );
        const overlap = (a: DOMRect, b: DOMRect) =>
          a.left < b.right - 0.7 &&
          a.right > b.left + 0.7 &&
          a.top < b.bottom - 0.7 &&
          a.bottom > b.top + 0.7;
        const collisions: string[] = [];
        for (let i = 0; i < boxes.length; i++) {
          const a = boxes[i].getBoundingClientRect();
          for (let j = i + 1; j < boxes.length; j++) {
            if (overlap(a, boxes[j].getBoundingClientRect()))
              collisions.push(`${boxes[i].className}/${boxes[j].className}`);
          }
        }
        const hudCollisions: string[] = [];
        for (const tool of hud) {
          const target = tool.getBoundingClientRect();
          for (const box of boxes)
            if (overlap(target, box.getBoundingClientRect()))
              hudCollisions.push(`${tool.dataset.hud}/${box.className}`);
        }
        const hudOverlaps: string[] = [];
        for (let i = 0; i < hud.length; i++)
          for (let j = i + 1; j < hud.length; j++)
            if (
              overlap(
                hud[i].getBoundingClientRect(),
                hud[j].getBoundingClientRect(),
              )
            )
              hudOverlaps.push(`${hud[i].dataset.hud}/${hud[j].dataset.hud}`);
        const sceneryOcclusions: string[] = [];
        for (const deco of document.querySelectorAll("svg .decos > g"))
          for (const tool of hud)
            if (
              overlap(
                deco.getBoundingClientRect(),
                tool.getBoundingClientRect(),
              )
            )
              sceneryOcclusions.push(tool.dataset.hud!);
        const title = document.querySelector<HTMLElement>(".current-card h2");
        return {
          documentOverflow:
            document.documentElement.scrollHeight > innerHeight ||
            document.body.scrollHeight > innerHeight,
          mapOverflow: map.scrollHeight > map.clientHeight,
          sceneEdges: [scene.x, scene.y, scene.width, scene.height],
          noBars: [".app-header", ".game-bar"].every((selector) => {
            const style = getComputedStyle(document.querySelector(selector)!);
            return (
              style.position === "absolute" &&
              style.backgroundColor === "rgba(0, 0, 0, 0)" &&
              style.backgroundImage === "none" &&
              style.boxShadow === "none" &&
              style.borderTopWidth === "0px" &&
              style.borderBottomWidth === "0px"
            );
          }),
          hudCollisions,
          hudOverlaps,
          sceneryOcclusions,
          hudClipped: hud
            .filter((el) => {
              const r = el.getBoundingClientRect();
              return (
                r.left < -1 ||
                r.right > innerWidth + 1 ||
                r.top < -1 ||
                r.bottom > innerHeight + 1
              );
            })
            .map((el) => el.dataset.hud),
          collisions,
          clipped: boxes
            .filter((b) => {
              const r = b.getBoundingClientRect();
              return r.top < -1 || r.bottom > innerHeight + 1;
            })
            .map((b) => b.className),
          titleOverflow: title
            ? title.scrollHeight > title.clientHeight + 1
            : false,
          // scrollHeight includes the wooden posts and speech-bubble tails
          // (::after). Inspect actual text bounds rather than flagging those
          // intentional decorations as clipped lesson titles.
          labelOverflow: Array.from(
            document.querySelectorAll<HTMLElement>(
              ".station-label, .world-sign, .sister-speech",
            ),
          )
            .filter((el) => {
              const range = document.createRange();
              range.selectNodeContents(el);
              const text = range.getBoundingClientRect();
              const box = el.getBoundingClientRect();
              return text.top < box.top - 1 || text.bottom > box.bottom + 1;
            })
            .map((el) => el.textContent),
          fill: [
            ...document.querySelectorAll<HTMLElement>(".progress-fill"),
          ].map((f) => f.getBoundingClientRect().width),
          currentSessionIsolated:
            document.querySelector(".progress-caption bdi")?.tagName === "BDI",
        };
      });
      expect(geometry.documentOverflow).toBe(false);
      expect(geometry.mapOverflow).toBe(false);
      expect(geometry.sceneEdges).toEqual([0, 0, width, height]);
      expect(geometry.noBars).toBe(true);
      expect(geometry.hudCollisions).toEqual([]);
      expect(geometry.hudOverlaps).toEqual([]);
      expect(geometry.hudClipped).toEqual([]);
      expect(geometry.sceneryOcclusions).toEqual([]);
      await expect(page.locator(".map-heading, .map-help")).toHaveCount(0);
      expect(geometry.collisions).toEqual([]);
      expect(geometry.clipped).toEqual([]);
      expect(geometry.titleOverflow).toBe(false);
      expect(geometry.labelOverflow).toEqual([]);
      expect(geometry.currentSessionIsolated).toBe(true);
      if (count === 0) expect(geometry.fill).toEqual([0, 0]);
      expect(errors).toEqual([]);
      await page.screenshot({
        path: `artifacts/screenshots/${width}x${height}-${count}.png`,
      });
    });

test("wheel, drag, both arrows, keyboard, world switch and My station", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await seedClassroom(page, 7);
  await page.goto("/");
  const map = page.locator(".map-viewport");
  await expect(page.locator('[data-station="8"]')).toHaveClass(/is-current/);
  const position = () => map.evaluate((el) => el.scrollLeft);
  const original = await position();
  // Transparent gaps between floating HUD groups belong to the landscape,
  // rather than an invisible header strip that eats pointer/wheel events.
  expect(
    await page.evaluate(
      () => !!document.elementFromPoint(683, 40)?.closest(".map-viewport"),
    ),
  ).toBe(true);
  await page.mouse.move(683, 40);
  await page.mouse.wheel(0, 180);
  await expect.poll(position).toBeLessThan(original - 100);
  await page.getByRole("button", { name: "محطتي", exact: true }).click();
  await expect.poll(position).toBeCloseTo(original, 0);
  await page.mouse.move(660, 350);
  await page.mouse.wheel(0, 330);
  await expect.poll(position).toBeLessThan(original - 100);
  await page.getByRole("button", { name: "محطتي", exact: true }).click();
  await expect.poll(position).toBeCloseTo(original, 0);
  await page
    .getByRole("button", { name: "تقدّم يسارًا في الخارطة", exact: true })
    .click();
  await expect.poll(position).toBeLessThan(original - 300);
  await page
    .getByRole("button", { name: "ارجع يمينًا في الخارطة", exact: true })
    .click();
  await expect.poll(position).toBeCloseTo(original, 0);
  await map.focus();
  await page.keyboard.press("ArrowLeft");
  await expect.poll(position).toBeLessThan(original - 100);
  await page.getByRole("button", { name: "محطتي", exact: true }).click();
  await page.mouse.move(1100, 620);
  await page.mouse.down();
  await page.mouse.move(1320, 620, { steps: 8 });
  await page.mouse.up();
  await expect.poll(position).toBeLessThan(original - 100);
  await page
    .getByRole("button", { name: "المستوى الثاني", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "المستوى الثاني", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "محطتي", exact: true }).click();
  await expect.poll(position).toBeCloseTo(original, 0);
  await page.locator('[data-station-button="8"]').focus();
  await page.keyboard.press("ArrowLeft");
  await expect(page.locator('[data-station-button="9"]')).toBeFocused();
});

test("lessons open without accounts; browsing and locked links never complete a lesson", async ({
  page,
}) => {
  await seedClassroom(page, 0);
  const external: string[] = [];
  page.on("request", (request) => {
    if (/supabase|journey-auth|\/auth\//i.test(request.url()))
      external.push(request.url());
  });
  await page.goto("/#/lesson/12?mode=review");
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.locator(".lesson")).toHaveCount(0);
  await page
    .getByRole("button", { name: "العودة إلى محطتي", exact: true })
    .click();
  await page.getByRole("button", { name: "ابدأ الحصة", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "هدفي اليوم", exact: true }),
  ).toBeVisible();
  await expect(
    page.locator('input[type="password"], input[type="email"]'),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "العودة إلى رحلتي", exact: true })
    .click();
  await expect(page.getByRole("progressbar")).toHaveAttribute(
    "aria-valuenow",
    "0",
  );
  await page.getByRole("button", { name: "إدارة الحصص", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "إنهاء الحصة وفتح التالية", exact: true }),
  ).toBeVisible();
  await expect(
    page.locator('input[type="password"], input[type="email"]'),
  ).toHaveCount(0);
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "إدارة الحصص", exact: true }),
  ).toBeFocused();
  expect(external).toEqual([]);
});

test("simple completion, one-step undo, persistence and confirmed reset without accounts", async ({
  page,
}) => {
  await seedClassroom(page, 7, ["ليان", "سامي"]);
  await page.goto("/");
  const manage = () =>
    page.getByRole("button", { name: "إدارة الحصص", exact: true }).click();
  await manage();
  await page
    .getByRole("button", { name: "إنهاء الحصة وفتح التالية", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("progressbar")).toHaveAttribute(
    "aria-valuenow",
    "8",
  );
  await page.reload();
  await expect(page.getByRole("progressbar")).toHaveAttribute(
    "aria-valuenow",
    "8",
  );
  await manage();
  await page
    .getByRole("button", { name: "التراجع عن آخر حصة", exact: true })
    .click();
  await expect(page.getByRole("progressbar")).toHaveAttribute(
    "aria-valuenow",
    "7",
  );
  await manage();
  await page
    .getByRole("button", { name: "بدء رحلة جديدة", exact: true })
    .click();
  await page.getByRole("button", { name: "إلغاء", exact: true }).click();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("progressbar")).toHaveAttribute(
    "aria-valuenow",
    "7",
  );
  await manage();
  await page
    .getByRole("button", { name: "بدء رحلة جديدة", exact: true })
    .click();
  await page
    .getByRole("button", { name: "نعم، رحلة جديدة", exact: true })
    .click();
  await expect(page.getByRole("progressbar")).toHaveAttribute(
    "aria-valuenow",
    "0",
  );
  await page.getByRole("button", { name: "مَن يتحدث؟", exact: true }).click();
  await expect(page.locator(".names-list li")).toHaveCount(2);
});

test("finishing the sixteenth lesson celebrates once, including after reload", async ({
  page,
}) => {
  await seedClassroom(page, 15);
  await page.goto("/");
  await page.getByRole("button", { name: "إدارة الحصص", exact: true }).click();
  await page
    .getByRole("button", { name: "إنهاء الحصة وفتح التالية", exact: true })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "أحسنت! أتممت المستوى الأول",
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "هيا إلى العالم الثاني", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole("progressbar")).toHaveAttribute(
    "aria-valuenow",
    "16",
  );
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("Arabic accessibility, contrast and keyboard focus trap", async ({
  page,
}) => {
  await seedClassroom(page, 7);
  await page.goto("/");
  await expect(page.locator('[data-station="8"]')).toHaveClass(/is-current/);
  await page.evaluate(() => document.fonts.ready);
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  writeFileSync(
    "artifacts/axe-map.json",
    JSON.stringify(results.violations, null, 2),
  );
  expect(
    results.violations.map((v) => ({
      id: v.id,
      nodes: v.nodes.map((n) => n.target),
    })),
  ).toEqual([]);
  await page.getByRole("button", { name: "إدارة الحصص", exact: true }).click();
  await page.keyboard.press("Shift+Tab");
  expect(
    await page
      .locator(".modal-panel")
      .evaluate((el) => el.contains(document.activeElement)),
  ).toBe(true);
  await page.keyboard.press("Tab");
  expect(
    await page
      .locator(".modal-panel")
      .evaluate((el) => el.contains(document.activeElement)),
  ).toBe(true);
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "إدارة الحصص", exact: true }),
  ).toBeFocused();
});

test("touch swipe stays horizontal on a phone", async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  await seedClassroom(page, 7);
  await page.goto("/");
  await expect(page.locator('[data-station="8"]')).toHaveClass(/is-current/);
  const map = page.locator(".map-viewport"),
    before = await map.evaluate((el) => el.scrollLeft);
  const cdp = await context.newCDPSession(page);
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x: 70, y: 500 }],
  });
  for (const x of [100, 140, 180, 225, 280, 325])
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x, y: 500 }],
    });
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await expect
    .poll(() => map.evaluate((el) => el.scrollLeft))
    .toBeLessThan(before - 80);
  expect(await page.evaluate(() => scrollY)).toBe(0);
  await context.close();
});
