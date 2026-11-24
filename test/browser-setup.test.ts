import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const read = (path: string): string => readFileSync(join(repoRoot, path), "utf8");

type Manifest = {
  scripts: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies: Record<string, string>;
};
const manifest: Manifest = JSON.parse(read("package.json"));
const lockfile: { packages: Record<string, { devDependencies?: Record<string, string> }> } =
  JSON.parse(read("package-lock.json"));
const config = read("playwright.config.ts");

describe("browser test setup", () => {
  it("AC-6: @playwright/test is an exact devDependency recorded by the lockfile, with no dependencies", () => {
    expect(manifest.devDependencies["@playwright/test"]).toMatch(/^\d+\.\d+\.\d+$/);
    expect(manifest.dependencies ?? {}).toEqual({});
    expect(lockfile.packages[""]?.devDependencies).toEqual(manifest.devDependencies);
    expect(lockfile.packages["node_modules/@playwright/test"]).toBeDefined();
  });

  it("AC-6: test and verify are unchanged", () => {
    expect(manifest.scripts.test).toBe("vitest run");
    expect(manifest.scripts.verify).toBe(
      "npm run lint && npm run typecheck && npm test && npm run build",
    );
  });

  it("AC-6: test:browser runs Playwright and browser:install installs only Chromium", () => {
    expect(manifest.scripts["test:browser"]).toBe("playwright test");
    expect(manifest.scripts["browser:install"]).toBe("playwright install chromium");
    expect(manifest.scripts["browser:install"]).not.toContain("--with-deps");
  });

  it("AC-6: the config has one Chromium project, only *.spec.ts, no reuse, no fixed ports, no html reporter", () => {
    expect(config).toContain('testDir: "test/browser"');
    expect(config).toMatch(/testMatch:\s*"\*\*\/\*\.spec\.ts"/);
    expect(config.match(/name:\s*"chromium"/g)).toHaveLength(1);
    expect(config).toContain("reuseExistingServer: false");
    expect(config).not.toMatch(/\b(3000|5173)\b/);
    expect(config).toContain("chromiumSandbox: true");
    expect(config).not.toContain("--no-sandbox");
    expect(config).not.toMatch(/reporter:[^\n]*html/);
  });

  it("AC-6: no Playwright file matches the Vitest include", () => {
    const vitestConfig = read("vitest.config.ts");
    expect(vitestConfig).toContain('"test/**/*.test.ts"');
    expect(vitestConfig).not.toContain(".spec.");
    expect(config).not.toMatch(/testMatch:[^\n]*\.test\./);
  });
});
