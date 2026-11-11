import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { mockSupabase } from "./supabase-fixture";

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
      await mockSupabase(page, count);
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.goto("/");
      await page.evaluate(() => document.fonts.ready);
      // The award dialog intentionally makes the map/header inert. Include the hidden
      // progressbar while waiting for the authoritative count, then dismiss the award.
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
        const top = document
          .querySelector(".app-header")!
          .getBoundingClientRect().bottom;
        const bottom = document
          .querySelector(".game-bar")!
          .getBoundingClientRect().top;
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
        const title = document.querySelector<HTMLElement>(".current-card h2");
        return {
          documentOverflow:
            document.documentElement.scrollHeight > innerHeight ||
            document.body.scrollHeight > innerHeight,
          mapOverflow: map.scrollHeight > map.clientHeight,
          collisions,
          clipped: boxes
            .filter((b) => {
              const r = b.getBoundingClientRect();
              return r.top < top - 1 || r.bottom > bottom + 1;
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
  await mockSupabase(page, 7);
  await page.goto("/");
  const map = page.locator(".map-viewport");
  await expect(page.locator('[data-station="8"]')).toHaveClass(/is-current/);
  const position = () => map.evaluate((el) => el.scrollLeft);
  const original = await position();
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

test("locked deep links, child panels and lessons never change progress", async ({
  page,
}) => {
  const fixture = await mockSupabase(page, 0);
  await page.goto("/#/lesson/12");
  await expect(page.getByRole("dialog")).toBeVisible();
  expect(await page.locator(".lesson").count()).toBe(0);
  await page
    .getByRole("button", { name: "العودة إلى محطتي", exact: true })
    .click();
  await page.getByRole("button", { name: "ابدأ الحصة", exact: true }).click();
  await expect(page.locator(".lesson")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "هدفي اليوم", exact: true }),
  ).toBeVisible();
  expect(
    await page
      .getByRole("button", { name: /إكمال|اعتماد|فتح التالية/ })
      .count(),
  ).toBe(0);
  await page
    .getByRole("button", { name: "العودة إلى رحلتي", exact: true })
    .click();
  await page.getByRole("button", { name: "المدرّب", exact: true }).click();
  await expect(page.getByLabel("البريد الإلكتروني")).toBeVisible();
  expect(
    await page
      .getByRole("button", { name: "اعتماد الحصة التالية", exact: true })
      .count(),
  ).toBe(0);
  expect(
    fixture.calls.filter(
      (c) => c.path.includes("rpc/") || c.method === "PATCH",
    ),
  ).toEqual([]);
  expect(fixture.completed).toBe(0);
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "المدرّب", exact: true }),
  ).toBeFocused();
});

test("teacher email/password, confirmation, one-step approval, undo, student list and code generation", async ({
  page,
}) => {
  const fixture = await mockSupabase(page, 7, "guest");
  await page.goto("/");
  await page.getByRole("button", { name: "المدرّب", exact: true }).click();
  await page.getByLabel("البريد الإلكتروني").fill("teacher@example.com");
  await page.getByLabel("كلمة المرور").fill("fixture-password");
  await page.getByRole("button", { name: "دخول آمن", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "اعتماد الحصة التالية", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "اعتماد الحصة التالية", exact: true })
    .click();
  expect(fixture.completed).toBe(7);
  await page
    .getByRole("button", { name: "نعم، اعتمد الحصة", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("progressbar")).toHaveAttribute(
    "aria-valuenow",
    "8",
  );
  expect(fixture.completed).toBe(8);
  expect(
    fixture.calls.filter((c) => c.path.endsWith("approve_next_session")),
  ).toHaveLength(1);
  await page.getByRole("button", { name: "المدرّب", exact: true }).click();
  await page
    .getByRole("button", { name: "التراجع عن آخر اعتماد", exact: true })
    .click();
  await page
    .getByRole("button", { name: "نعم، تراجع خطوة واحدة", exact: true })
    .click();
  expect(fixture.completed).toBe(7);
  await page.getByRole("button", { name: "إضافة تلميذ", exact: true }).click();
  await page.getByLabel("اسم التلميذ").fill("سامي");
  await page
    .getByRole("button", { name: "إضافة وتوليد رمز الدخول", exact: true })
    .click();
  await expect(page.locator(".generated-code")).toHaveText("JKMN2-PQRS3");
  await page.getByRole("button", { name: "حفظت الرمز", exact: true }).click();
  await expect(page.getByRole("button", { name: /سامي 0\/32/ })).toBeVisible();
});

test("child code login uses an Auth session, and Realtime opens exactly the next station", async ({
  page,
}) => {
  const fixture = await mockSupabase(page, 0, "guest");
  await page.goto("/");
  await page.getByRole("button", { name: "دخول التلميذ", exact: true }).click();
  await page.getByLabel("رمز الدخول").fill("ABCD2-EFGH3");
  await page.getByRole("button", { name: "دخول آمن", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.locator(".account-status")).toHaveText("ليان");
  await fixture.approveAsTeacher();
  await expect(page.locator('[data-station="2"]')).toHaveClass(/is-current/);
  await expect(page.locator('[data-station="3"]')).toHaveClass(/is-locked/);
  await expect(page.getByRole("progressbar")).toHaveAttribute(
    "aria-valuenow",
    "1",
  );
  await expect(page.locator(".is-unlocking")).toHaveCount(0);
});

test("Arabic accessibility, contrast and keyboard focus trap", async ({
  page,
}) => {
  await mockSupabase(page, 7);
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
  await page.getByRole("button", { name: "المدرّب", exact: true }).click();
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
    page.getByRole("button", { name: "المدرّب", exact: true }),
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
  await mockSupabase(page, 7);
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
