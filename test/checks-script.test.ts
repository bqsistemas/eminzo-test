import { spawnSync } from "node:child_process";
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const checksScript = join(repoRoot, "factory", "checks.sh");

const STEPS = {
  install: "ci --ignore-scripts --no-audit --no-fund",
  lint: "run lint",
  typecheck: "run typecheck",
  test: "test",
  build: "run build",
  browserInstall: "run browser:install",
  browserTest: "run test:browser",
} as const;
const ORDER = [
  STEPS.install,
  STEPS.lint,
  STEPS.typecheck,
  STEPS.test,
  STEPS.build,
  STEPS.browserInstall,
  STEPS.browserTest,
];

// A fake npm: it records each call's arguments and fails the call named in FAKE_NPM_FAIL.
const FAKE_NPM = `#!/bin/sh
printf '%s\\n' "$*" >> "$FAKE_NPM_LOG"
if [ -n "$FAKE_NPM_FAIL" ] && [ "$*" = "$FAKE_NPM_FAIL" ]; then
  echo "fake npm: failing $*" >&2
  exit 7
fi
exit 0
`;

const workdirs: string[] = [];

afterEach(() => {
  for (const dir of workdirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

type Run = { code: number | null; calls: string[]; output: string };

function runChecks(failing?: string, focusedChanges?: string[]): Run {
  const dir = mkdtempSync(join(tmpdir(), "checks-script-"));
  workdirs.push(dir);
  const bin = join(dir, "bin");
  const log = join(dir, "npm.log");
  mkdirSync(bin);
  writeFileSync(join(bin, "npm"), FAKE_NPM);
  chmodSync(join(bin, "npm"), 0o755);

  const env: NodeJS.ProcessEnv = {
    ...process.env,
    PATH: `${bin}${delimiter}${process.env.PATH ?? ""}`,
    FACTORY_CHECK_MODE: "full",
    FAKE_NPM_LOG: log,
    FAKE_NPM_FAIL: failing ?? "",
  };
  delete env.FACTORY_CHANGED_FILES;
  if (focusedChanges) {
    const changed = join(dir, "changed.txt");
    writeFileSync(changed, `${focusedChanges.join("\n")}\n`);
    env.FACTORY_CHECK_MODE = "focused";
    env.FACTORY_CHANGED_FILES = changed;
  }

  const result = spawnSync("sh", [checksScript], { cwd: repoRoot, env, encoding: "utf8" });
  const calls = existsSync(log) ? readFileSync(log, "utf8").split("\n").filter(Boolean) : [];
  return { code: result.status, calls, output: `${result.stdout}${result.stderr}` };
}

describe("factory/checks.sh in full mode", () => {
  it("AC-4: runs npm ci, lint, typecheck, test, build and the two browser steps in that order and exits 0", () => {
    const { code, calls } = runChecks();

    expect(calls).toEqual(ORDER);
    expect(code).toBe(0);
  });

  it.each([
    ["install", STEPS.install],
    ["lint", STEPS.lint],
    ["typecheck", STEPS.typecheck],
    ["test", STEPS.test],
    ["build", STEPS.build],
    ["browser install", STEPS.browserInstall],
    ["browser test", STEPS.browserTest],
  ])("AC-4: a failing %s step exits non-zero and runs none of the later steps", (_name, step) => {
    const { code, calls } = runChecks(step);

    expect(code).not.toBe(0);
    expect(calls).toEqual(ORDER.slice(0, ORDER.indexOf(step) + 1));
  });
});

describe("factory/checks.sh in focused mode", () => {
  it("skips every step when only docs/ or CHANGELOG.md changed", () => {
    const { code, calls } = runChecks(undefined, ["CHANGELOG.md", "docs/guide.md"]);

    expect(calls).toEqual([]);
    expect(code).toBe(0);
  });

  it.each([
    ["README.md, which the docs test reads", ["README.md"]],
    ["factory/project.md, which the docs test reads", ["factory/project.md"]],
    ["source code", ["docs/guide.md", "src/web/status.ts"]],
  ])("runs the full checks when %s changed", (_name, changed) => {
    const { code, calls } = runChecks(undefined, changed);

    expect(calls).toEqual(ORDER);
    expect(code).toBe(0);
  });
});
