// @vitest-environment happy-dom
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { beforeEach, describe, expect, it } from "vitest";

const here = dirname(fileURLToPath(import.meta.url));
const html = readFileSync(join(here, "index.html"), "utf8");
const css = readFileSync(join(here, "styles.css"), "utf8");

/** Every `selector { body }` rule, with the ones inside an `@media` flagged. */
function rules(): { selector: string; body: string; inMedia: boolean; media: string }[] {
  const out: { selector: string; body: string; inMedia: boolean; media: string }[] = [];
  const clean = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const mediaRe = /@media([^{]*)\{((?:[^{}]*\{[^}]*\})*)\s*\}/g;
  const inner = (text: string, inMedia: boolean, media: string) => {
    for (const m of text.matchAll(/([^{}@]+)\{([^}]*)\}/g)) {
      out.push({ selector: (m[1] ?? "").trim(), body: m[2] ?? "", inMedia, media });
    }
  };
  for (const m of clean.matchAll(mediaRe)) inner(m[2] ?? "", true, (m[1] ?? "").trim());
  inner(clean.replace(mediaRe, ""), false, "");
  return out;
}

const nav = () => document.querySelector("nav.sidebar") as HTMLElement;

describe("sidebar", () => {
  beforeEach(() => {
    const body = /<body[^>]*>([\s\S]*)<\/body>/.exec(html)?.[1] ?? "";
    document.body.innerHTML = body;
  });

  it("AC-1: one named nav.sidebar precedes main.panel as its sibling inside .layout", () => {
    expect(document.querySelectorAll("nav.sidebar")).toHaveLength(1);
    const el = nav();
    const label = el.getAttribute("aria-label")?.trim();
    const by = el.getAttribute("aria-labelledby");
    const named = label || (by ? document.getElementById(by)?.textContent?.trim() : "");
    expect(named).toBeTruthy();
    const main = document.querySelector("main.panel") as HTMLElement;
    expect(el.closest("main.panel")).toBeNull();
    expect(el.parentElement).toBe(main.parentElement);
    expect(el.parentElement?.classList.contains("layout")).toBe(true);
    expect(el.compareDocumentPosition(main) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(/<html[^>]*lang="en"/.test(html)).toBe(true);
  });

  it("AC-2: every group has one h2 title and one ul of li with exactly one a", () => {
    const groups = [...nav().querySelectorAll(".sidebar-group")];
    expect(groups.length).toBeGreaterThanOrEqual(1);
    for (const group of groups) {
      const titles = group.querySelectorAll(".sidebar-group-title");
      expect(titles).toHaveLength(1);
      expect(titles[0]?.tagName).toBe("H2");
      expect(titles[0]?.textContent?.trim()).not.toBe("");
      const lists = group.querySelectorAll("ul.sidebar-links");
      expect(lists).toHaveLength(1);
      const items = [...(lists[0]?.querySelectorAll("li") ?? [])];
      expect(items.length).toBeGreaterThanOrEqual(1);
      for (const li of items) {
        const links = li.querySelectorAll("a");
        expect(links).toHaveLength(1);
        expect(links[0]?.textContent?.trim()).not.toBe("");
      }
    }
    const all = nav().querySelectorAll("a").length;
    const inGroups = nav().querySelectorAll(".sidebar-group a").length;
    expect(all).toBe(inGroups);
  });

  it("AC-3: links go to #greeting and #service-status, unique, existing once in main.panel", () => {
    const hrefs = [...nav().querySelectorAll("a")].map((a) => a.getAttribute("href") ?? "");
    expect(new Set(hrefs).size).toBe(hrefs.length);
    const group = nav()
      .querySelector('.sidebar-group a[href="#greeting"]')
      ?.closest(".sidebar-group");
    expect(group?.querySelector('a[href="#service-status"]')).not.toBeNull();
    for (const href of hrefs) {
      expect(href).toMatch(/^#[^\s#]+$/);
      const id = href.slice(1);
      expect(document.querySelectorAll(`[id="${id}"]`)).toHaveLength(1);
      expect(document.querySelector(`main.panel [id="${id}"]`)).not.toBeNull();
    }
  });

  it("AC-4 and AC-6: the example elements keep their attributes and .panel keeps max-width 40rem", () => {
    const status = document.querySelector("main.panel #service-status");
    expect(status?.getAttribute("role")).toBe("status");
    expect(status?.getAttribute("aria-live")).toBe("polite");
    expect(status?.getAttribute("aria-atomic")).toBe("true");
    expect(status?.getAttribute("aria-busy")).toBe("true");
    expect(status?.getAttribute("data-state")).toBe("loading");
    expect(status?.textContent?.trim()).toBe("Checking the service…");
    const greeting = document.querySelector("main.panel #greeting");
    expect(greeting?.textContent?.trim()).toBe("Hola, Mundo");
    expect(greeting?.hasAttribute("role")).toBe(false);
    const panel = rules().find((r) => r.selector === ".panel" && !r.inMedia);
    expect(panel?.body).toMatch(/max-width:\s*40rem/);
  });

  it("AC-5: a width @media restyles .layout and no .sidebar rule is fixed or absolute", () => {
    const layout = rules().find(
      (r) =>
        r.inMedia &&
        /(^|[\s,])\.layout\s*$/.test(r.selector) &&
        /(^|;|\s)(display|grid-template-columns|grid-template-areas|flex-direction)\s*:/.test(
          r.body,
        ) &&
        /(min-width|max-width|width)/.test(r.media),
    );
    expect(layout).toBeDefined();
    for (const r of rules().filter((x) => x.selector.includes(".sidebar"))) {
      expect(r.body).not.toMatch(/position\s*:\s*(fixed|absolute)/);
    }
  });

  it("AC-6: no scripts beyond main.ts, no inline handlers or controls, no motion or tokens", () => {
    const scripts = document.querySelectorAll("script");
    expect(html.match(/<script\b/g)).toHaveLength(1);
    expect(html).toContain('<script type="module" src="./main.ts"></script>');
    expect(scripts.length).toBeLessThanOrEqual(1);
    for (const el of document.querySelectorAll("*")) {
      expect(el.hasAttribute("style")).toBe(false);
      for (const attr of el.getAttributeNames()) expect(attr.startsWith("on")).toBe(false);
    }
    expect(nav().querySelectorAll("button, details, input")).toHaveLength(0);
    expect(css).not.toMatch(/animation|transition|@keyframes|scroll-behavior\s*:\s*smooth/);
    expect(css).not.toMatch(/(^|[;{\s])--[\w-]+\s*:/);
    expect(css).not.toContain("var(");
  });

  it("AC-7: sidebar links have a visible :focus-visible outline and a :hover rule", () => {
    const all = rules();
    const focus = all.find((r) => /\.sidebar[^,{]*a:focus-visible/.test(r.selector));
    expect(focus).toBeDefined();
    const outline = /outline\s*:\s*([^;]+)/.exec(focus?.body ?? "")?.[1]?.trim() ?? "";
    expect(outline).not.toBe("");
    expect(outline).not.toMatch(/^(none|0)(\s|$)/);
    expect(all.some((r) => /\.sidebar[^,{]*a:hover/.test(r.selector))).toBe(true);
  });
});
