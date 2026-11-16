import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const read = (path: string): string => readFileSync(join(repoRoot, path), "utf8");

const manifest: { scripts: Record<string, string> } = JSON.parse(read("package.json"));
const nodeMajor = read(".nvmrc").trim();
const projectMd = read("factory/project.md");
const readme = read("README.md");

/** Body of the `## <name>` section, without its heading. */
function section(markdown: string, name: string): string {
  const lines = markdown.split("\n");
  const start = lines.findIndex((line) => new RegExp(`^##\\s+${name}\\b`, "i").test(line));
  if (start < 0) return "";
  const end = lines.findIndex((line, index) => index > start && /^##\s/.test(line));
  return lines.slice(start + 1, end < 0 ? undefined : end).join("\n");
}

function citedScripts(markdown: string): string[] {
  return [...markdown.matchAll(/npm run ([\w:.-]+)/g)].map((match) => match[1] ?? "");
}

// The same rule the factory gate applies to the Module map: tests, docs, lockfiles and dot
// paths need no entry; any other path must be named by a backticked path, folder or glob.
const IGNORED = [
  /(^|\/)tests?\//,
  /(^|\/)__tests__\//,
  /\.(test|spec)\.[a-z]+$/,
  /(^|\/)docs?\//,
  /\.md$/i,
  /(^|\/)(package-lock\.json|yarn\.lock|pnpm-lock\.yaml|npm-shrinkwrap\.json|[^/]*\.lock)$/,
  /(^|\/)\.[^/]+/,
];

function mapTokens(map: string): string[] {
  return [...map.matchAll(/`([^`\s]+)`/g)].map((match) =>
    (match[1] ?? "").replace(/^\.\//, "").replace(/:$/, ""),
  );
}

function covers(token: string, path: string): boolean {
  if (token.endsWith("/")) return path.startsWith(token) || path.includes(`/${token}`);
  const body = token
    .split("*")
    .map((part) => part.replace(/[.+?^${}()|[\]\\]/g, "\\$&"))
    .join("[^/]*");
  return new RegExp(token.includes("/") ? `(^|/)${body}$` : `^${body}$`).test(path);
}

describe("project documentation", () => {
  it("AC-8: ## Stack names the runtime with its pinned major, the package manager and the tools", () => {
    const stack = section(projectMd, "Stack");

    expect(stack).toContain(`Node.js ${nodeMajor}`);
    for (const tool of ["npm", "TypeScript", "Vite", "Vitest", "Biome", "happy-dom"]) {
      expect(stack).toContain(tool);
    }
  });

  it("AC-8: ## Commands gives install, run, test, build and verify", () => {
    const commands = section(projectMd, "Commands");

    for (const command of [
      "npm ci",
      "npm run dev:server",
      "npm run dev:web",
      "npm test",
      "npm run build",
      "npm run verify",
    ]) {
      expect(commands).toContain(command);
    }
    for (const label of ["Install", "Run", "Test", "Build", "Verify"]) {
      expect(commands).toMatch(new RegExp(`^- ${label}:`, "m"));
    }
  });

  it("AC-8: the README gives the Node version, install, run and check commands", () => {
    expect(readme).toContain(`Node.js ${nodeMajor}`);
    for (const command of ["npm ci", "npm run dev:server", "npm run dev:web", "npm run verify"]) {
      expect(readme).toContain(command);
    }
  });

  it.each([
    ["README.md", readme],
    ["factory/project.md", projectMd],
  ])("AC-8: every `npm run <script>` cited in %s exists in package.json", (_file, markdown) => {
    const cited = citedScripts(markdown);

    expect(cited.length).toBeGreaterThan(0);
    for (const script of cited) {
      expect(Object.keys(manifest.scripts), `npm run ${script}`).toContain(script);
    }
  });

  it("AC-8: every tracked file is covered by the ## Module map", () => {
    const listed = spawnSync("git", ["ls-files", "-z"], { cwd: repoRoot, encoding: "utf8" });
    expect(listed.status).toBe(0);
    const paths = listed.stdout.split("\0").filter(Boolean);
    expect(paths).toContain("package.json");

    const tokens = mapTokens(section(projectMd, "Module map"));
    const uncovered = paths.filter(
      (path) =>
        !IGNORED.some((pattern) => pattern.test(path)) &&
        !tokens.some((token) => covers(token, path)),
    );

    expect(uncovered).toEqual([]);
  });
});
