// TCP port settings shared by the service entry point and the Vite dev server config.

/** Both processes listen on loopback only. */
export const LOOPBACK_HOST = "127.0.0.1";
export const DEFAULT_SERVICE_PORT = 3000;
export const DEFAULT_WEB_PORT = 5173;

/**
 * The port in `env[name]`, or `fallback` when the variable is not set.
 * @throws Error with a message that names the variable when the value is not an integer
 * from 1 to 65535 (written in plain decimal digits).
 */
export function readPort(
  env: Readonly<Record<string, string | undefined>>,
  name: string,
  fallback: number,
): number {
  const raw = env[name];
  if (raw === undefined) return fallback;
  const port = /^\d{1,5}$/.test(raw) ? Number(raw) : Number.NaN;
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error(`${name} must be an integer from 1 to 65535, got ${JSON.stringify(raw)}`);
  }
  return port;
}
