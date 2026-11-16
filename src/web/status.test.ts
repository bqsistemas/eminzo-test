// @vitest-environment happy-dom
import type { Server } from "node:http";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../server/app.ts";
import { loadStatus, mountStatus, renderStatus } from "./status.ts";

function makeContainer(): HTMLElement {
  document.body.innerHTML = "";
  const container = document.createElement("p");
  container.id = "service-status";
  document.body.append(container);
  return container;
}

/** Moves the happy-dom page to `url`, so fetch sees that page origin. */
function setPageUrl(url: string): void {
  const api: unknown = Reflect.get(window, "happyDOM");
  if (typeof api !== "object" || api === null || !("setURL" in api)) {
    throw new Error("this test needs the happy-dom environment");
  }
  const { setURL } = api;
  if (typeof setURL !== "function") throw new Error("happyDOM.setURL is missing");
  setURL.call(api, url);
}

function textOf(view: "loading" | "working" | "unavailable"): string {
  const probe = document.createElement("p");
  renderStatus(probe, view);
  return probe.textContent ?? "";
}

describe("against the real service", () => {
  let server: Server;
  let origin: string;

  beforeAll(async () => {
    server = createApp();
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    if (address === null || typeof address === "string") throw new Error("no TCP address");
    origin = `http://127.0.0.1:${address.port}`;
  });

  afterAll(async () => {
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it.each([
    ["pointed at the service origin", true],
    ["with a relative query, as the page does behind the Vite proxy", false],
  ])(
    "AC-4: mountStatus %s shows loading first and then working with visible text",
    async (_name, absolute) => {
      // In the browser the page and /api share one origin (the Vite proxy). happy-dom enforces the
      // same-origin policy like a browser, so the page is put on the service origin here.
      setPageUrl(`${origin}/`);
      const container = makeContainer();

      const mounted = mountStatus(container, absolute ? { baseUrl: origin } : {});

      expect(container.dataset.state).toBe("loading");
      expect(container.textContent?.trim()).not.toBe("");

      await mounted;

      expect(container.dataset.state).toBe("working");
      const text = container.textContent?.trim() ?? "";
      expect(text).not.toBe("");
      expect(text).toMatch(/working/i);
      expect(text).not.toBe(textOf("loading"));
    },
  );

  it("a page on another origin cannot read the status: the service sends no CORS headers", async () => {
    setPageUrl("http://localhost:5999/");
    const container = makeContainer();

    await mountStatus(container, { baseUrl: origin });

    expect(container.dataset.state).toBe("unavailable");
  });
});

type FakeFetch = typeof fetch;

function respondWith(body: string, status = 200): FakeFetch {
  return async () =>
    new Response(body, {
      status,
      headers: { "Content-Type": "application/json; charset=utf-8" },
    });
}

const MARKUP = '<img src=x onerror="window.__pwned=1">';

const failures: Array<[string, FakeFetch, number?]> = [
  [
    "a network error",
    async () => {
      throw new TypeError("fetch failed");
    },
  ],
  [
    "a fetch that throws synchronously",
    () => {
      throw new TypeError("fetch is broken");
    },
  ],
  [
    "a request slower than timeoutMs that ignores the abort signal",
    () => new Promise(() => {}),
    20,
  ],
  [
    "a request slower than timeoutMs that honours the abort signal",
    (_input, init) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => reject(new Error("aborted")));
      }),
    20,
  ],
  ["HTTP 500 with a valid body", respondWith('{"status":"ok"}', 500)],
  ["HTTP 503 with a valid body", respondWith('{"status":"ok"}', 503)],
  ["HTTP 404", respondWith('{"error":"not_found"}', 404)],
  ["HTTP 304 (not 2xx)", async () => new Response(null, { status: 304 })],
  ["invalid JSON", respondWith("<html>not json</html>")],
  ["an empty body", respondWith("")],
  ["a body without status", respondWith('{"state":"ok"}')],
  ["a JSON null body", respondWith("null")],
  ["a JSON array body", respondWith('["ok"]')],
  ["a bare JSON string", respondWith('"ok"')],
  ["an unknown status value", respondWith('{"status":"degraded"}')],
  ["a status with a different case", respondWith('{"status":"OK"}')],
  ["a non-string status", respondWith('{"status":true}')],
  ["a status holding HTML markup", respondWith(JSON.stringify({ status: MARKUP }))],
  [
    "a status holding HTML markup with HTTP 500",
    respondWith(JSON.stringify({ status: MARKUP, detail: MARKUP }), 500),
  ],
];

describe("when the query fails", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it.each(failures)(
    "AC-5: %s leaves the container unavailable",
    async (_name, fakeFetch, timeoutMs) => {
      const container = makeContainer();

      await mountStatus(container, {
        baseUrl: "http://127.0.0.1:9",
        fetch: fakeFetch,
        timeoutMs: timeoutMs ?? 1_000,
      });

      expect(container.dataset.state).toBe("unavailable");
      const text = container.textContent?.trim() ?? "";
      expect(text).not.toBe("");
      expect(text).not.toBe(textOf("working"));
      expect(container.children).toHaveLength(0);
      expect(document.body.innerHTML).not.toContain("<img");
      expect(document.body.innerHTML).not.toContain("onerror");
      expect(document.body.innerHTML).not.toContain("degraded");
      expect(document.body.innerHTML).not.toContain("not_found");
      expect(document.querySelector("img")).toBeNull();
    },
  );

  it.each(failures)(
    "AC-5: loadStatus resolves to unavailable on %s",
    async (_name, fakeFetch, timeoutMs) => {
      await expect(
        loadStatus({
          baseUrl: "http://127.0.0.1:9",
          fetch: fakeFetch,
          timeoutMs: timeoutMs ?? 1_000,
        }),
      ).resolves.toBe("unavailable");
    },
  );

  it("AC-5: an unreachable service, with the real fetch, ends unavailable", async () => {
    const container = makeContainer();

    await mountStatus(container, { baseUrl: "http://127.0.0.1:9", timeoutMs: 2_000 });

    expect(container.dataset.state).toBe("unavailable");
    expect(container.textContent?.trim()).not.toBe(textOf("working"));
  });

  it("AC-5: an invalid base URL ends unavailable instead of rejecting", async () => {
    await expect(
      loadStatus({ baseUrl: "not a url", fetch: respondWith('{"status":"ok"}') }),
    ).resolves.toBe("unavailable");
  });
});

describe("renderStatus", () => {
  it("writes text only, never markup, for every view", () => {
    const container = makeContainer();
    for (const view of ["loading", "working", "unavailable"] as const) {
      renderStatus(container, view);
      expect(container.dataset.state).toBe(view);
      expect(container.children).toHaveLength(0);
      expect(container.textContent?.trim()).not.toBe("");
    }
    expect(new Set([textOf("loading"), textOf("working"), textOf("unavailable")]).size).toBe(3);
  });

  it("marks the live region busy only while loading", () => {
    const container = makeContainer();
    renderStatus(container, "loading");
    expect(container.getAttribute("aria-busy")).toBe("true");
    renderStatus(container, "working");
    expect(container.getAttribute("aria-busy")).toBe("false");
  });
});
