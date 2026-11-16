import { describe, expect, it } from "vitest";
import { readPort } from "./port.ts";

describe("readPort", () => {
  it("uses the fallback when the variable is not set", () => {
    expect(readPort({}, "SERVICE_PORT", 3000)).toBe(3000);
  });

  it.each([
    ["1", 1],
    ["3001", 3001],
    ["65535", 65535],
  ])("accepts %s", (raw, port) => {
    expect(readPort({ SERVICE_PORT: raw }, "SERVICE_PORT", 3000)).toBe(port);
  });

  it.each(["", "0", "65536", "-1", "3.5", "1e3", " 3000", "3000abc", "0x10", "http"])(
    "rejects %j with a message that names the variable",
    (raw) => {
      expect(() => readPort({ SERVICE_PORT: raw }, "SERVICE_PORT", 3000)).toThrow(
        /SERVICE_PORT must be an integer from 1 to 65535/,
      );
    },
  );
});
