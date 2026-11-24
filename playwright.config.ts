import { defineConfig, devices } from "@playwright/test";
import { LOOPBACK_HOST } from "./src/server/port.ts";
import { browserPorts, PANEL_DOWN_ENV, PANEL_UP_ENV } from "./test/browser/ports.ts";

const ports = browserPorts();
const panelUp = `http://${LOOPBACK_HOST}:${ports.webUp}`;
const panelDown = `http://${LOOPBACK_HOST}:${ports.webDown}`;
process.env[PANEL_UP_ENV] = panelUp;
process.env[PANEL_DOWN_ENV] = panelDown;

const vite = "node node_modules/vite/bin/vite.js";

// Browser tests live in test/browser/*.spec.ts. Playwright's default testMatch also takes
// *.test.ts, which are Vitest's, so it is limited here. Everything it starts listens on loopback
// on ports the operating system gave; it never reuses a running server and stops them all at the end.
export default defineConfig({
  testDir: "test/browser",
  testMatch: "**/*.spec.ts",
  outputDir: "test-results",
  forbidOnly: true,
  retries: 0,
  reporter: "list",
  projects: [
    {
      name: "chromium",
      // Playwright turns the Chromium sandbox off unless chromiumSandbox is true.
      use: {
        ...devices["Desktop Chrome"],
        headless: true,
        launchOptions: { chromiumSandbox: true },
      },
    },
  ],
  webServer: [
    {
      command: "node src/server/main.ts",
      env: { SERVICE_PORT: String(ports.service) },
      url: `http://${LOOPBACK_HOST}:${ports.service}/api/status`,
      reuseExistingServer: false,
    },
    {
      command: vite,
      env: { SERVICE_PORT: String(ports.service), WEB_PORT: String(ports.webUp) },
      url: panelUp,
      reuseExistingServer: false,
    },
    {
      command: vite,
      env: { SERVICE_PORT: String(ports.dead), WEB_PORT: String(ports.webDown) },
      url: panelDown,
      reuseExistingServer: false,
    },
  ],
});
