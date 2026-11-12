import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { seedClassroom } from "./classroom-fixture";

const names = ["ليان", "سامي", "مريم", "آدم", "نور", "يوسف"];
const openWheel = (page: Page) =>
  page.getByRole("button", { name: "مَن يتحدث؟", exact: true }).click();
async function draw(page: Page): Promise<string> {
  await page.getByRole("button", { name: "أدر العجلة", exact: true }).click();
  await expect(page.locator(".is-spinning")).toHaveCount(0);
  const result = page.locator(".speaker-result strong");
  await expect(result).toBeVisible();
  return (await result.innerText()).trim();
}
mkdirSync("artifacts/screenshots", { recursive: true });

test("optional names are entered directly, deduplicated and saved without an account", async ({
  page,
}) => {
  await seedClassroom(page);
  await page.goto("/");
  await expect(
    page.getByText(/دخول التلميذ|دخول المدرّب|وضع تجريبي/),
  ).toHaveCount(0);
  await openWheel(page);
  await expect(
    page.getByRole("button", { name: "أدر العجلة", exact: true }),
  ).toBeDisabled();
  await page
    .getByLabel("اسم واحد في كل سطر", { exact: true })
    .fill("  ليان \nسامي\n\n مريم،آدم\nنور\nيوسف\nليان");
  await page.getByRole("button", { name: "حفظ الأسماء", exact: true }).click();
  await expect(page.locator(".names-list li")).toHaveCount(6);
  await expect(
    page.getByRole("button", { name: "أدر العجلة", exact: true }),
  ).toBeEnabled();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "مَن يتحدث؟", exact: true }),
  ).toBeFocused();
  await page.reload();
  await openWheel(page);
  await expect(page.locator(".names-list li bdi")).toHaveText(names);
  await expect(
    page.locator('input[type="password"], input[type="email"]'),
  ).toHaveCount(0);
});

test("no repeats until all students speak; the round persists and can restart", async ({
  page,
}) => {
  await seedClassroom(page, 7, names);
  await page.goto("/");
  await openWheel(page);
  const selected: string[] = [];
  for (let i = 0; i < names.length; i++) {
    const name = await draw(page);
    expect(names).toContain(name);
    expect(selected).not.toContain(name);
    selected.push(name);
    await expect(page.locator(".names-list .has-spoken")).toHaveCount(i + 1);
    // The visual sector under twelve o'clock must be the announced result.
    const match = await page.locator(".wheel-disc").evaluate((el, index) => {
      const rotation = Number(
        (el as SVGElement).style.transform.match(/rotate\(([-.\d]+)deg\)/)?.[1],
      );
      const offset = (rotation + ((index + 0.5) * 360) / 6) % 360;
      return Math.min(offset, 360 - offset);
    }, names.indexOf(name));
    expect(match).toBeLessThan(0.001);
    if (i === 1) {
      await page.reload();
      await openWheel(page);
      await expect(page.locator(".names-list .has-spoken")).toHaveCount(2);
    }
  }
  await expect(
    page.getByRole("button", { name: "أدر العجلة", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByText("شارك الجميع! نبدأ جولة جديدة؟", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "جولة جديدة", exact: true }).click();
  await expect(page.locator(".names-list .has-spoken")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "أدر العجلة", exact: true }),
  ).toBeEnabled();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("progressbar")).toHaveAttribute(
    "aria-valuenow",
    "7",
  );
});

test("repeat selection is optional, including a single-name classroom", async ({
  page,
}) => {
  await seedClassroom(page, 0, ["سامي"]);
  await page.goto("/");
  await openWheel(page);
  await page
    .getByLabel("دون تكرار حتى يشارك الجميع", { exact: true })
    .uncheck();
  for (let i = 0; i < 3; i++) expect(await draw(page)).toBe("سامي");
  await expect(
    page.getByRole("button", { name: "أدر العجلة", exact: true }),
  ).toBeEnabled();
  await page.getByLabel("دون تكرار حتى يشارك الجميع", { exact: true }).check();
  expect(await draw(page)).toBe("سامي");
  await expect(
    page.getByRole("button", { name: "أدر العجلة", exact: true }),
  ).toBeDisabled();
});

test("editing/deleting names restarts only the round, not lesson progress", async ({
  page,
}) => {
  await seedClassroom(page, 7, names);
  await page.goto("/");
  await openWheel(page);
  await draw(page);
  await page
    .getByRole("button", { name: "تعديل الأسماء", exact: true })
    .click();
  await page.getByLabel("اسم واحد في كل سطر", { exact: true }).fill("نور\nآدم");
  await page.getByRole("button", { name: "حفظ الأسماء", exact: true }).click();
  await expect(page.locator(".names-list li bdi")).toHaveText(["نور", "آدم"]);
  await expect(page.locator(".names-list .has-spoken")).toHaveCount(0);
  await page
    .getByRole("button", { name: "تعديل الأسماء", exact: true })
    .click();
  await page.getByLabel("اسم واحد في كل سطر", { exact: true }).fill("");
  await page.getByRole("button", { name: "حفظ الأسماء", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "أدر العجلة", exact: true }),
  ).toBeDisabled();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("progressbar")).toHaveAttribute(
    "aria-valuenow",
    "7",
  );
});

test("the wheel is available while teaching a lesson, and completion stays one step", async ({
  page,
}) => {
  await seedClassroom(page, 0, names);
  await page.goto("/");
  await page.getByRole("button", { name: "ابدأ الحصة", exact: true }).click();
  await expect(page.locator(".lesson")).toBeVisible();
  await openWheel(page);
  expect(names).toContain(await draw(page));
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "مَن يتحدث؟", exact: true }),
  ).toBeFocused();
  // زر «إنهاء الحصة» يظهر في شريحة النهاية فقط؛ عبور الشرائح لا يُنهي الحصة.
  const finish = page.getByRole("button", { name: "إنهاء الحصة", exact: true });
  await expect(finish).toHaveCount(0);
  while (!(await finish.isVisible()))
    await page.getByRole("button", { name: "التالي", exact: true }).click();
  await finish.click();
  await expect(page.getByRole("progressbar")).toHaveAttribute(
    "aria-valuenow",
    "1",
  );
  await expect(page.locator('[data-station="2"]')).toHaveClass(/is-current/);
  await expect(page.locator('[data-station="3"]')).toHaveClass(/is-locked/);
});

test("normal-motion spinning locks duplicate draws and reveals one result only at the end", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await seedClassroom(page, 0, names);
  await page.goto("/");
  await openWheel(page);
  await page.getByRole("button", { name: "أدر العجلة", exact: true }).click();
  // Observe one instant atomically: separate browser round trips can outlast
  // the real animation and incorrectly inspect the already-finished state.
  const during = await page.evaluate(() => {
    const el = document.querySelector(".wheel-playground")!;
    return {
      spinning: el.classList.contains("is-spinning"),
      result: el.querySelector(".speaker-result strong") !== null,
      drawDisabled:
        el.querySelector<HTMLButtonElement>(".spin-button")!.disabled,
      editDisabled: document.querySelector<HTMLButtonElement>(
        ".names-heading button",
      )!.disabled,
    };
  });
  expect(during).toEqual({
    spinning: true,
    result: false,
    drawDisabled: true,
    editDisabled: true,
  });
  await expect(page.locator(".speaker-result strong")).toBeVisible({
    timeout: 6000,
  });
  await expect(page.locator(".names-list .has-spoken")).toHaveCount(1);
});

test("closing mid-spin cancels the draw, with no stale timer selecting a student", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await seedClassroom(page, 0, names);
  await page.goto("/");
  await openWheel(page);
  await page.getByRole("button", { name: "أدر العجلة", exact: true }).click();
  await expect(page.locator(".is-spinning")).toHaveCount(1);
  await page.keyboard.press("Escape");
  // Observe beyond the cancelled animation deadline: an immediate assertion
  // would miss a stale timer selecting someone after the dialog closed.
  await page.waitForTimeout(4100);
  await openWheel(page);
  await expect(page.locator(".names-list .has-spoken")).toHaveCount(0);
  await expect(page.locator(".speaker-result strong")).toHaveCount(0);
});

for (const [width, height] of [
  [1440, 900],
  [390, 844],
])
  test(`names and wheel dialog stays accessible and fits ${width}×${height}`, async ({
    page,
  }) => {
    // Three full WCAG scans plus browser-context setup in constrained CI.
    test.setTimeout(90000);
    await page.setViewportSize({ width, height });
    await seedClassroom(page, 7, names);
    await page.goto("/");
    await openWheel(page);
    await page.evaluate(() => document.fonts.ready);
    const violations: Record<string, unknown> = {};
    const check = async (state: string) => {
      const result = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze();
      violations[state] = result.violations.map((v) => ({
        id: v.id,
        nodes: v.nodes.map((n) => n.target),
      }));
      expect(violations[state], state).toEqual([]);
      const overflow = await page.locator(".speaker-panel").evaluate((el) => ({
        horizontal: el.scrollWidth > el.clientWidth + 1,
        document: document.documentElement.scrollHeight > innerHeight,
        clipped:
          el.getBoundingClientRect().left < 0 ||
          el.getBoundingClientRect().right > innerWidth,
      }));
      expect(overflow).toEqual({
        horizontal: false,
        document: false,
        clipped: false,
      });
    };
    await check("names-and-wheel");
    await draw(page);
    await check("chosen-speaker");
    await page.screenshot({
      path: `artifacts/screenshots/classroom-wheel-${width}x${height}.png`,
    });
    await page
      .getByRole("button", { name: "تعديل الأسماء", exact: true })
      .click();
    await check("names-editor");
    writeFileSync(
      `artifacts/axe-classroom-${width}.json`,
      JSON.stringify(violations, null, 2),
    );
  });

test("large/long names remain plain text; numeric sectors keep a large class readable", async ({
  page,
}) => {
  const roster = Array.from(
    { length: 60 },
    (_, i) => `الطالب صاحب الاسم الطويل ${i + 1}`,
  );
  roster[0] = "<img src=x onerror=alert(1)>";
  await page.setViewportSize({ width: 390, height: 844 });
  await seedClassroom(page, 0, roster);
  await page.goto("/");
  await openWheel(page);
  await expect(page.locator(".names-list li")).toHaveCount(60);
  await expect(page.locator(".wheel-disc text").first()).toHaveText("1");
  await expect(page.locator(".names-list img")).toHaveCount(0);
  await expect(page.locator(".speaker-panel")).toBeVisible();
  expect(roster).toContain(await draw(page));
  expect(
    await page
      .locator(".speaker-panel")
      .evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
  ).toBe(true);
});
