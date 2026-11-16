import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { STATUS_PATH, type StatusResponse } from "../shared/status.ts";

type ErrorResponse = { error: "not_found" | "method_not_allowed" | "internal_error" };

// Sent on every response. No CORS headers: the panel reaches the service through the Vite proxy,
// on the same origin, so no other origin is ever allowed to read these responses.
const BASE_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
} as const;

/** The HTTP service, not listening yet: the caller picks the host and port. */
export function createApp(): Server {
  return createServer((request, response) => {
    try {
      route(request, response);
    } catch {
      // Never leak the error (message or stack) to the client.
      if (response.headersSent) {
        response.destroy();
      } else {
        send(response, 500, { error: "internal_error" });
      }
    }
  });
}

function route(request: IncomingMessage, response: ServerResponse): void {
  if (pathOf(request.url) !== STATUS_PATH) {
    send(response, 404, { error: "not_found" });
    return;
  }
  if (request.method !== "GET") {
    response.setHeader("Allow", "GET");
    send(response, 405, { error: "method_not_allowed" });
    return;
  }
  const body: StatusResponse = { status: "ok" };
  send(response, 200, body);
}

/** The request target without its query string; matched exactly, never normalised. */
function pathOf(url: string | undefined): string {
  const target = url ?? "";
  const query = target.indexOf("?");
  return query === -1 ? target : target.slice(0, query);
}

function send(
  response: ServerResponse,
  status: number,
  body: StatusResponse | ErrorResponse,
): void {
  const json = JSON.stringify(body);
  response.writeHead(status, { ...BASE_HEADERS, "Content-Length": Buffer.byteLength(json) });
  response.end(json);
}
