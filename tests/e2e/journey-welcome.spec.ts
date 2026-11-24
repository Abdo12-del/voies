import { expect, test } from "@playwright/test";
import { seedClassroom } from "./classroom-fixture";

test("the opening screen leads to the map without changing progress, and browser back returns to it", async ({ page }) => {
  await seedClassroom(page, 7);
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "رحلتي مع المتحدث الصغير" })).toBeVisible();
  await expect(page.getByRole("img", { name: /ليلى وسامي والأخت الصغيرة/ })).toBeVisible();
  await expect(page.locator(".map-viewport")).toHaveCount(0);
  await page.getByRole("button", { name: "هيا نبدأ الرحلة" }).click();
  await expect(page).toHaveURL(/#\/map$/);
  await expect(page.getByRole("progressbar", { includeHidden: true })).toHaveAttribute("aria-valuenow", "7");
  await page.goBack();
  await expect(page.getByRole("heading", { name: "رحلتي مع المتحدث الصغير" })).toBeVisible();
  await page.goForward();
  await expect(page.locator(".map-viewport")).toBeVisible();
});

test("direct lesson links and explicit map links bypass the welcome", async ({ page }) => {
  await seedClassroom(page);
  await page.goto("/#/lesson/1");
  await expect(page.locator(".lesson-app")).toBeVisible();
  await page.goto("/#/map");
  await expect(page.locator(".map-viewport")).toBeVisible();
});
