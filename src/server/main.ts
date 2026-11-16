// Entry point of the service: `npm run dev:server` runs it from source.
import { createApp } from "./app.ts";
import { DEFAULT_SERVICE_PORT, LOOPBACK_HOST, readPort } from "./port.ts";

const SHUTDOWN_GRACE_MS = 5_000;

let port: number;
try {
  port = readPort(process.env, "SERVICE_PORT", DEFAULT_SERVICE_PORT);
} catch (error) {
  console.error(`service: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}

const server = createApp();

server.on("error", (error) => {
  console.error(`service: cannot listen on ${LOOPBACK_HOST}:${port}: ${error.message}`);
  process.exit(1);
});

server.listen(port, LOOPBACK_HOST, () => {
  console.log(`service: listening on http://${LOOPBACK_HOST}:${port}`);
});

function shutdown(signal: NodeJS.Signals): void {
  console.log(`service: ${signal} received, closing`);
  server.close(() => process.exit(0));
  server.closeIdleConnections();
  setTimeout(() => {
    server.closeAllConnections();
    process.exit(0);
  }, SHUTDOWN_GRACE_MS).unref();
}

process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);
