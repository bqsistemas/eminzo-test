import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import {
  DEFAULT_SERVICE_PORT,
  DEFAULT_WEB_PORT,
  LOOPBACK_HOST,
  readPort,
} from "./src/server/port.ts";

export default defineConfig(() => {
  const webPort = readPort(process.env, "WEB_PORT", DEFAULT_WEB_PORT);
  const servicePort = readPort(process.env, "SERVICE_PORT", DEFAULT_SERVICE_PORT);

  return {
    root: fileURLToPath(new URL("./src/web", import.meta.url)),
    build: {
      outDir: fileURLToPath(new URL("./dist/web", import.meta.url)),
      emptyOutDir: true,
    },
    server: {
      host: LOOPBACK_HOST,
      port: webPort,
      strictPort: true,
      // The browser only talks to this dev server: /api goes through the proxy, so the page and
      // the service share one origin and the service needs no CORS headers.
      cors: false,
      proxy: {
        "/api": { target: `http://${LOOPBACK_HOST}:${servicePort}` },
      },
    },
  };
});
