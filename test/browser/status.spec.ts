import { expect, test } from "@playwright/test";
import { PANEL_DOWN_ENV, PANEL_UP_ENV } from "./ports.ts";

// Longer than the panel's own request timeout (DEFAULT_TIMEOUT_MS, 5 s), so the final state wins.
const FINAL_STATE_TIMEOUT_MS = 15_000;

function panelUrl(name: string): string {
  const url = process.env[name];
  if (!url) throw new Error(`${name} is not set: run the tests with \`npm run test:browser\``);
  return url;
}

test("AC-1: the panel shows the service as working when it is running", async ({ page }) => {
  await page.goto(panelUrl(PANEL_UP_ENV));
  const status = page.locator("#service-status");

  await expect(status).toBeVisible();
  await expect(status).toHaveAttribute("data-state", "working", {
    timeout: FINAL_STATE_TIMEOUT_MS,
  });
  await expect(status).toContainText("The service is working.");
  await expect(status).not.toContainText("unavailable");
});

test("AC-2: the panel shows the service as unavailable when it is down", async ({ page }) => {
  await page.goto(panelUrl(PANEL_DOWN_ENV));
  const status = page.locator("#service-status");

  await expect(status).toBeVisible();
  await expect(status).toHaveAttribute("data-state", "unavailable", {
    timeout: FINAL_STATE_TIMEOUT_MS,
  });
  await expect(status).toContainText("The service is unavailable.");
  await expect(status).not.toContainText("is working");
});
