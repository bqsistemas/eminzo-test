// @vitest-environment happy-dom
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { beforeEach, describe, expect, it } from "vitest";

const here = dirname(fileURLToPath(import.meta.url));
const html = readFileSync(join(here, "index.html"), "utf8");
const css = readFileSync(join(here, "styles.css"), "utf8");

function greetingRule(): string {
  const match = /(?:^|[}\s])\.greeting\s*\{([^}]*)\}/.exec(css);
  if (!match) throw new Error("no .greeting rule in styles.css");
  return match[1] ?? "";
}

describe("greeting", () => {
  beforeEach(() => {
    const body = /<body[^>]*>([\s\S]*)<\/body>/.exec(html)?.[1] ?? "";
    document.body.innerHTML = body;
  });

  it("AC-1: one #greeting inside main.panel says Hello, world", () => {
    expect(document.querySelectorAll("#greeting")).toHaveLength(1);
    const el = document.querySelector("main.panel #greeting");
    expect(el).not.toBeNull();
    expect(el?.textContent?.trim()).toContain("Hello, world");
  });

  it("AC-2: .greeting centers its text", () => {
    expect(greetingRule()).toMatch(/text-align:\s*center/);
  });

  it("AC-3: #greeting has no live-region attributes and static text", () => {
    const el = document.querySelector("#greeting");
    expect(el?.hasAttribute("role")).toBe(false);
    expect(el?.hasAttribute("aria-live")).toBe(false);
    expect(el?.hasAttribute("aria-busy")).toBe(false);
    expect(el?.textContent?.trim()).not.toBe("");
  });

  it("AC-4: #service-status and noscript are unchanged", () => {
    const el = document.querySelector("#service-status");
    expect(el?.getAttribute("role")).toBe("status");
    expect(el?.getAttribute("aria-live")).toBe("polite");
    expect(el?.getAttribute("aria-atomic")).toBe("true");
    expect(el?.getAttribute("aria-busy")).toBe("true");
    expect(el?.getAttribute("data-state")).toBe("loading");
    expect(el?.textContent?.trim()).toBe("Checking the service…");
    expect(html).toContain("<noscript>");
  });

  it("AC-5: .greeting has no fixed width or out-of-flow position", () => {
    const rule = greetingRule();
    expect(rule).not.toMatch(/(^|[;\s])width\s*:/);
    expect(rule).not.toMatch(/position\s*:\s*(absolute|fixed)/);
  });

  it("AC-6: the verify script still runs lint, typecheck, test and build", () => {
    const pkg = JSON.parse(readFileSync(join(here, "../../package.json"), "utf8"));
    const verify: string = pkg.scripts.verify;
    const order = ["lint", "typecheck", "test", "build"].map((s) => verify.indexOf(s));
    expect(order.every((i) => i >= 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
  });
});
