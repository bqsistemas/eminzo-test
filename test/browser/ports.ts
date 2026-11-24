import { spawnSync } from "node:child_process";
import { LOOPBACK_HOST } from "../../src/server/port.ts";

export type BrowserPorts = {
  /** The service the connected panel talks to. */
  service: number;
  /** The panel proxied to the running service. */
  webUp: number;
  /** The panel proxied to a port where nothing listens. */
  webDown: number;
  /** The port where nothing is started: the "service down". */
  dead: number;
};

const KEYS = {
  service: "BROWSER_TEST_SERVICE_PORT",
  webUp: "BROWSER_TEST_WEB_UP_PORT",
  webDown: "BROWSER_TEST_WEB_DOWN_PORT",
  dead: "BROWSER_TEST_DEAD_PORT",
} as const;

// Opens four loopback listeners at once (so the ports differ), prints them and exits.
const PICK = `
const net = require("node:net");
const open = () => new Promise((resolve, reject) => {
  const s = net.createServer();
  s.once("error", reject);
  s.listen(0, "${LOOPBACK_HOST}", () => resolve(s));
});
Promise.all([open(), open(), open(), open()]).then((servers) => {
  console.log(JSON.stringify(servers.map((s) => s.address().port)));
  for (const s of servers) s.close();
});
`;

/**
 * Four free loopback ports, chosen once per run. Playwright evaluates its config again in every
 * worker, so the first evaluation stores them in `process.env` and the rest reuse them.
 */
export function browserPorts(): BrowserPorts {
  const stored = Object.values(KEYS).map((key) => process.env[key]);
  if (stored.every((value) => value !== undefined)) {
    const [service, webUp, webDown, dead] = stored.map(Number) as [number, number, number, number];
    return { service, webUp, webDown, dead };
  }
  const picked = spawnSync(process.execPath, ["-e", PICK], { encoding: "utf8" });
  if (picked.status !== 0) throw new Error(`could not pick free ports: ${picked.stderr}`);
  const [service, webUp, webDown, dead] = JSON.parse(picked.stdout) as [
    number,
    number,
    number,
    number,
  ];
  process.env[KEYS.service] = String(service);
  process.env[KEYS.webUp] = String(webUp);
  process.env[KEYS.webDown] = String(webDown);
  process.env[KEYS.dead] = String(dead);
  return { service, webUp, webDown, dead };
}

export const PANEL_UP_ENV = "BROWSER_TEST_PANEL_UP_URL";
export const PANEL_DOWN_ENV = "BROWSER_TEST_PANEL_DOWN_URL";
