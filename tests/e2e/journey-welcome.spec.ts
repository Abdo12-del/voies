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

test("normal motion reveals the actual map in layers and restores keyboard focus", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await seedClassroom(page, 7);
  await page.goto("/");
  await page.getByRole("button", { name: "هيا نبدأ الرحلة" }).click();
  const arrival = page.locator(".is-map-arriving");
  await expect(arrival).toHaveAttribute("inert", "");
  await expect(page.locator(".journey-welcome.is-exiting")).toHaveCount(1);
  await expect(page.locator(".is-map-arriving .station").first()).toHaveCSS("animation-name", "journey-piece-arrive");
  await expect(page.locator(".journey-welcome.is-exiting")).toHaveCount(0);
  await expect(page.locator(".map-viewport")).toBeFocused();
  await expect(page.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "7");
  await expect(page.locator(".sister-guide img")).toHaveAttribute("src", "/characters/sister-map-welcome.webp");
  await expect(page.locator(".laila-guide img")).toHaveAttribute("src", "/characters/laila-wave.webp");
});

test("reduced motion enters immediately, while a browser back cancels an in-flight entry", async ({ page }) => {
  await seedClassroom(page);
  await page.goto("/");
  await page.getByRole("button", { name: "هيا نبدأ الرحلة" }).click();
  await expect(page.locator(".is-map-arriving")).toHaveCount(0);
  await expect(page.locator(".map-viewport")).toBeFocused();
  await page.goBack();
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.getByRole("button", { name: "هيا نبدأ الرحلة" }).click();
  await page.goBack();
  await expect(page.getByRole("heading", { name: "رحلتي مع المتحدث الصغير" })).toBeVisible();
  await page.waitForTimeout(1700);
  await expect(page.locator(".is-map-arriving")).toHaveCount(0);
  await page.getByRole("button", { name: "هيا نبدأ الرحلة" }).click();
  await expect(page.locator(".map-viewport")).toBeFocused();
});

test("a saved celebration waits until the animated arrival finishes", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await seedClassroom(page, 16);
  await page.goto("/");
  await page.getByRole("button", { name: "هيا نبدأ الرحلة" }).click();
  await expect(page.locator(".is-map-arriving")).toHaveCount(1);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("dialog")).toBeVisible({ timeout: 10000 });
});
