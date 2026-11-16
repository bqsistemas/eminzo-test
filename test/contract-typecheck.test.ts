import { spawnSync } from "node:child_process";
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const require = createRequire(import.meta.url);
// The project's own TypeScript, through its CLI: the compiler API changes between majors.
const tscBin = join(dirname(require.resolve("typescript/package.json")), "bin", "tsc");

const CONTRACT = "src/shared/status.ts";
const CONTRACT_TYPE = 'export type StatusResponse = { status: "ok" };';

const workdirs: string[] = [];

afterEach(() => {
  for (const dir of workdirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

/** A throwaway copy of the panel, the contract and their tsconfigs, outside the repo. */
function copyOfPanel(): string {
  const dir = mkdtempSync(join(tmpdir(), "contract-typecheck-"));
  workdirs.push(dir);
  for (const path of ["src/shared", "src/web", "tsconfig.json", "tsconfig.web.json"]) {
    cpSync(join(repoRoot, path), join(dir, path), { recursive: true });
  }
  return dir;
}

function mutateContract(dir: string, replacement: string): void {
  const file = join(dir, CONTRACT);
  const source = readFileSync(file, "utf8");
  // Fail loudly if the contract no longer has the expected shape: a silent no-op mutation
  // would make this test pass for the wrong reason.
  expect(source).toContain(CONTRACT_TYPE);
  writeFileSync(file, source.replace(CONTRACT_TYPE, replacement));
}

function typecheckPanel(dir: string): { code: number | null; output: string } {
  const result = spawnSync(
    process.execPath,
    [tscBin, "-p", join(dir, "tsconfig.web.json"), "--pretty", "false"],
    {
      cwd: dir,
      encoding: "utf8",
    },
  );
  return { code: result.status, output: `${result.stdout}${result.stderr}` };
}

function errorFiles(output: string): string[] {
  return output
    .split("\n")
    .map((line) => /^(.+?)\(\d+,\d+\): error TS\d+/.exec(line.trim())?.[1])
    .filter((file): file is string => file !== undefined)
    .map((file) => file.replaceAll("\\", "/"));
}

describe("the shared status contract", () => {
  it("AC-6: the untouched panel copy type-checks", () => {
    const { code, output } = typecheckPanel(copyOfPanel());
    expect(output).toBe("");
    expect(code).toBe(0);
  });

  it.each([
    ["(a) the status field is renamed", 'export type StatusResponse = { state: "ok" };'],
    ["(b) status gains a new value", 'export type StatusResponse = { status: "ok" | "degraded" };'],
  ])("AC-6: %s and tsc fails on a file under src/web/", (_name, replacement) => {
    const dir = copyOfPanel();
    mutateContract(dir, replacement);

    const { code, output } = typecheckPanel(dir);

    expect(code).not.toBe(0);
    const files = errorFiles(output);
    expect(files.some((file) => /(^|\/)src\/web\//.test(file))).toBe(true);
  });
});
