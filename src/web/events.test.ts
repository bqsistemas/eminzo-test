// @vitest-environment happy-dom
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { beforeEach, describe, expect, it } from "vitest";

const here = dirname(fileURLToPath(import.meta.url));
const html = readFileSync(join(here, "index.html"), "utf8");
const css = readFileSync(join(here, "styles.css"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");

/** Declaration bodies of every rule whose selector is exactly `selector` (any nesting). */
function bodies(selector: string): string[] {
  const out: string[] = [];
  for (const m of css.matchAll(/([^{}@]+)\{([^}]*)\}/g)) {
    if ((m[1] ?? "").trim() === selector) out.push(m[2] ?? "");
  }
  return out;
}

describe("events", () => {
  beforeEach(() => {
    document.body.innerHTML = /<body[^>]*>([\s\S]*)<\/body>/.exec(html)?.[1] ?? "";
  });

  it("AC-1: the aside#events text is exactly Espacio para eventos", () => {
    const el = document.querySelector("aside#events") as HTMLElement;
    expect(el.textContent?.trim()).toBe("Espacio para eventos");
  });

  it("AC-2: the text Sección para todos los eventos does not appear", () => {
    expect(html).not.toContain("Sección para todos los eventos");
  });

  it("AC-5: the project.md Events line cites Espacio para eventos", () => {
    const md = readFileSync(join(here, "../../factory/project.md"), "utf8");
    const line = md.split("\n").find((l) => l.startsWith("- Events:")) ?? "";
    expect(line).toContain("Espacio para eventos");
    expect(line).not.toContain("Sección para todos los eventos");
  });

  it("AC-3: aside#events keeps id, class, lang and the sidebar link keeps Eventos", () => {
    const el = document.querySelector("aside#events") as HTMLElement;
    expect(el.classList.contains("events")).toBe(true);
    expect(el.getAttribute("lang")).toBe("es");
    expect(document.querySelector('a[href="#events"]')?.textContent?.trim()).toBe("Eventos");
  });

  it("AC-1: one a[href='#events'] with text Eventos, sole link of its li in a .sidebar-group", () => {
    const links = document.querySelectorAll('a[href="#events"]');
    expect(links).toHaveLength(1);
    const a = links[0] as HTMLElement;
    expect(a.textContent?.trim()).toBe("Eventos");
    const li = a.closest("li");
    expect(li?.querySelectorAll("a")).toHaveLength(1);
    expect(a.closest(".sidebar-group")).not.toBeNull();
  });

  it("AC-2: #events exists once in main.panel, exact text, lang es, no style or on* attributes", () => {
    expect(document.querySelectorAll('[id="events"]')).toHaveLength(1);
    const el = document.querySelector("main.panel #events") as HTMLElement;
    expect(el).not.toBeNull();
    expect(el.textContent?.trim()).toBe("Espacio para eventos");
    expect(el.getAttribute("lang")).toBe("es");
    expect(el.hasAttribute("style")).toBe(false);
    for (const attr of el.getAttributeNames()) expect(attr.startsWith("on")).toBe(false);
  });

  it("AC-3: .events is display none by default and .events:target is displayed", () => {
    expect(bodies(".events").join(";")).toMatch(/display:\s*none/);
    const shown = bodies(".events:target").join(";");
    const display = /display:\s*([^;]+)/.exec(shown)?.[1]?.trim();
    expect(display).toBeTruthy();
    expect(display).not.toBe("none");
  });

  it("AC-4: .events:target aligns right and is not fixed or absolute", () => {
    const all = css.match(/[^{}@]*\.events:target[^{]*\{[^}]*\}/g)?.join(";") ?? "";
    expect(all).toMatch(/margin-left:\s*auto/);
    expect(all).not.toMatch(/position\s*:\s*(fixed|absolute)/);
    expect(css).not.toMatch(/\.events[^{]*\{[^}]*position\s*:\s*(fixed|absolute)/);
  });

  it("AC-5: one script, no button, details or input in the sidebar, no motion or tokens", () => {
    expect(html.match(/<script\b/g)).toHaveLength(1);
    expect(html).toContain('<script type="module" src="./main.ts"></script>');
    expect(
      document.querySelector("nav.sidebar")?.querySelectorAll("button, details, input"),
    ).toHaveLength(0);
    expect(css).not.toMatch(/animation|transition|@keyframes/);
    expect(css).not.toMatch(/(^|[;{\s])--[\w-]+\s*:/);
    expect(css).not.toContain("var(");
  });
});
