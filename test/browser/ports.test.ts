import { readFileSync } from "node:fs";
import { createServer } from "node:net";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { LOOPBACK_HOST } from "../../src/server/port.ts";
import { browserPorts } from "./ports.ts";

describe("browser test ports", () => {
  it("AC-5: picks four distinct free loopback ports, never 3000 or 5173, and reuses them", async () => {
    const ports = browserPorts();
    const values = Object.values(ports);

    expect(new Set(values).size).toBe(4);
    expect(values).not.toContain(3000);
    expect(values).not.toContain(5173);
    expect(browserPorts()).toEqual(ports);
    for (const port of values) {
      await new Promise<void>((resolve, reject) => {
        const server = createServer();
        server.once("error", reject);
        server.listen(port, LOOPBACK_HOST, () => server.close(() => resolve()));
      });
    }
  });
});

describe("browser spec", () => {
  it("AC-3: each test checks its own state and that the opposite one is absent", () => {
    const spec = readFileSync(fileURLToPath(new URL("./status.spec.ts", import.meta.url)), "utf8");

    expect(spec).toContain('"data-state", "working"');
    expect(spec).toContain('"data-state", "unavailable"');
    expect(spec).toContain('not.toContainText("unavailable")');
    expect(spec).toContain('not.toContainText("is working")');
  });
});
