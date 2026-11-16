import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const read = (path: string): string => readFileSync(join(repoRoot, path), "utf8");

type Manifest = {
  private?: boolean;
  type?: string;
  engines?: { node?: string };
  scripts: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies: Record<string, string>;
};

type Lockfile = {
  lockfileVersion: number;
  packages: Record<string, { devDependencies?: Record<string, string>; dependencies?: unknown }>;
};

const manifest: Manifest = JSON.parse(read("package.json"));
const lockfile: Lockfile = JSON.parse(read("package-lock.json"));
const nodeMajor = read(".nvmrc").trim();

// The full AC-1 run (a fresh clone outside the main checkout, then `npm ci` and `npm run verify`)
// needs the network and runs these very tests, so it is not repeated here. These tests pin what
// that run depends on.
describe("the manifest", () => {
  it("AC-1: pins one Node major in engines, .nvmrc and the running Node", () => {
    expect(nodeMajor).toMatch(/^\d+$/);
    expect(Number(nodeMajor)).toBeGreaterThanOrEqual(24);
    expect(manifest.engines?.node).toMatch(new RegExp(`^\\^${nodeMajor}\\.\\d+\\.\\d+$`));
    expect(process.versions.node.split(".")[0]).toBe(nodeMajor);
  });

  it("AC-1: makes npm refuse another Node and save exact versions", () => {
    const npmrc = read(".npmrc")
      .split("\n")
      .map((line) => line.trim());

    expect(npmrc).toContain("engine-strict=true");
    expect(npmrc).toContain("save-exact=true");
  });

  it("AC-1: has only exact devDependencies, matched by the lockfile", () => {
    expect(manifest.private).toBe(true);
    expect(manifest.type).toBe("module");
    expect(manifest.dependencies ?? {}).toEqual({});
    for (const [name, version] of Object.entries(manifest.devDependencies)) {
      expect(version, name).toMatch(/^\d+\.\d+\.\d+$/);
    }

    expect(lockfile.lockfileVersion).toBe(3);
    expect(lockfile.packages[""]?.devDependencies).toEqual(manifest.devDependencies);
    expect(lockfile.packages[""]?.dependencies).toBeUndefined();
  });

  it("AC-1: verify runs lint, typecheck, test and build in that order and stops at the first failure", () => {
    expect(manifest.scripts.verify).toBe(
      "npm run lint && npm run typecheck && npm test && npm run build",
    );
    for (const script of ["lint", "typecheck", "test", "build"]) {
      expect(manifest.scripts[script], script).toBeTruthy();
    }
    expect(manifest.scripts.lint).not.toMatch(/--write|--fix/);
  });
});
