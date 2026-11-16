import type { Server } from "node:http";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { isStatusResponse, STATUS_PATH } from "../shared/status.ts";
import { createApp } from "./app.ts";

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

function corsHeaders(response: Response): string[] {
  return [...response.headers.keys()].filter((name) => name.startsWith("access-control-allow-"));
}

function looksLikeStackTrace(text: string): boolean {
  return /\n\s+at\s/.test(text) || /\b[A-Za-z]*Error:/.test(text) || text.includes("node:");
}

describe("GET /api/status", () => {
  it.each([
    STATUS_PATH,
    `${STATUS_PATH}?`,
    `${STATUS_PATH}?probe=1`,
    `${STATUS_PATH}?a=1&b=%3Cx%3E`,
  ])(
    "AC-2: GET %s answers 200 with a JSON body the contract accepts and status ok",
    async (path) => {
      const response = await fetch(`${origin}${path}`);

      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toBe("application/json; charset=utf-8");
      expect(response.headers.get("cache-control")).toBe("no-store");
      expect(response.headers.get("x-content-type-options")).toBe("nosniff");

      const body: unknown = await response.json();
      expect(isStatusResponse(body)).toBe(true);
      expect(body).toEqual({ status: "ok" });
    },
  );
});

describe("unknown routes and methods", () => {
  it.each([
    "/",
    "/api",
    "/api/",
    `${STATUS_PATH}/`,
    `${STATUS_PATH}/extra`,
    "/API/STATUS",
    "/api/statusx",
    "/favicon.ico",
  ])("AC-3: GET %s answers 404 without CORS headers or a stack trace", async (path) => {
    const response = await fetch(`${origin}${path}`, {
      headers: { Origin: "http://evil.example" },
    });
    const text = await response.text();

    expect(response.status).toBe(404);
    expect(corsHeaders(response)).toEqual([]);
    expect(looksLikeStackTrace(text)).toBe(false);
  });

  it.each(["POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"])(
    "AC-3: %s on /api/status answers 405 with Allow: GET and no CORS headers",
    async (method) => {
      const response = await fetch(`${origin}${STATUS_PATH}`, {
        method,
        headers: {
          Origin: "http://evil.example",
          "Access-Control-Request-Method": "GET",
        },
        ...(method === "POST" || method === "PUT" || method === "PATCH"
          ? { body: '{"status":"down"}' }
          : {}),
      });
      const text = await response.text();

      expect(response.status).toBe(405);
      expect(response.headers.get("allow")).toBe("GET");
      expect(corsHeaders(response)).toEqual([]);
      expect(looksLikeStackTrace(text)).toBe(false);
    },
  );

  it("AC-3: a GET with an Origin header still carries no CORS headers", async () => {
    const response = await fetch(`${origin}${STATUS_PATH}`, {
      headers: { Origin: "http://evil.example" },
    });
    await response.arrayBuffer();

    expect(response.status).toBe(200);
    expect(corsHeaders(response)).toEqual([]);
  });
});
