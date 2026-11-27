import { expect, test } from "@playwright/test";
import { PANEL_UP_ENV } from "./ports.ts";

function panelUrl(): string {
  const url = process.env[PANEL_UP_ENV];
  if (!url)
    throw new Error(`${PANEL_UP_ENV} is not set: run the tests with \`npm run test:browser\``);
  return url;
}

test("AC-6: Eventos shows the block in the right half of the panel", async ({ page }) => {
  await page.setViewportSize({ width: 1200, height: 800 });
  await page.goto(panelUrl());
  const events = page.locator("#events");
  await expect(events).toBeHidden();

  await page.getByRole("link", { name: "Eventos" }).click();
  await expect(events).toBeVisible();
  await expect(events).toHaveText("Espacio para eventos");

  const box = await events.boundingBox();
  const panel = await page.locator("main.panel").boundingBox();
  if (!box || !panel) throw new Error("missing bounding box");
  expect(box.x).toBeGreaterThanOrEqual(panel.x + panel.width / 2 - 1);
  expect(box.x + box.width).toBeLessThanOrEqual(panel.x + panel.width + 1);
});

test("AC-7: no horizontal overflow on a narrow viewport", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await page.goto(panelUrl());
  await page.getByRole("link", { name: "Eventos" }).click();
  await expect(page.locator("#events")).toBeVisible();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});
