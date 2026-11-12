import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { writeFileSync } from "node:fs";
import { seedClassroom } from "./classroom-fixture";

test("legacy individual-account storage does not replace the local classroom journey", async ({
  page,
}) => {
  await seedClassroom(page, 7);
  await page.addInitScript(() => {
    localStorage.setItem(
      "almutahadith.progress.v1",
      JSON.stringify({
        version: 1,
        completed: 32,
        childName: "forged",
        pinHash: "forged",
      }),
    );
  });
  await page.goto("/#/lesson/32?mode=review");
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(
    page.getByRole("progressbar", { includeHidden: true }),
  ).toHaveAttribute("aria-valuenow", "7");
  await expect(page.locator(".lesson")).toHaveCount(0);
  await page
    .getByRole("button", { name: "العودة إلى محطتي", exact: true })
    .click();
  await expect(page.locator('[data-station="8"]')).toHaveClass(/is-current/);
  await expect(page.locator('[data-station="32"]')).toHaveClass(/is-locked/);
  await page.reload();
  await expect(page.getByRole("progressbar")).toHaveAttribute(
    "aria-valuenow",
    "7",
  );
});

test("award, golden world, locked dialog, lesson and classroom controls pass accessibility checks", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1024, height: 768 });
  await seedClassroom(page, 16);
  await page.goto("/");
  const violations: Record<string, unknown[]> = {};
  const check = async (name: string) => {
    await page.evaluate(() => document.fonts.ready);
    const result = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    violations[name] = result.violations.map((v) => ({
      id: v.id,
      nodes: v.nodes.map((n) => n.target),
    }));
    writeFileSync(
      "artifacts/axe-states.json",
      JSON.stringify(violations, null, 2),
    );
    expect(violations[name], name).toEqual([]);
  };
  await expect(page.getByRole("dialog")).toBeVisible();
  await check("level-one-award");
  await page
    .getByRole("button", { name: "هيا إلى العالم الثاني", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await check("golden-world");
  await page.locator('[data-station-button="18"]').click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await check("locked-station");
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "محطتي", exact: true }).click();
  await page.getByRole("button", { name: "ابدأ الحصة", exact: true }).click();
  await expect(page.locator(".lesson")).toBeVisible();
  await check("lesson");
  await page
    .getByRole("button", { name: "العودة إلى رحلتي", exact: true })
    .click();
  await page.getByRole("button", { name: "إدارة الحصص", exact: true }).click();
  await check("classroom-controls");
});
