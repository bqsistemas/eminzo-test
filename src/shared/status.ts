// The status contract shared by the service and the panel. The service implements it and the
// panel consumes it, so changing it here breaks the panel's type check until the panel adapts.
// It must not import Node or DOM APIs: both type checks compile this file.

/** The path of the status query. */
export const STATUS_PATH = "/api/status";

/** The body of a successful `GET STATUS_PATH`. */
export type StatusResponse = { status: "ok" };

/** Runtime guard for an untrusted body, kept in line with `StatusResponse`. */
export function isStatusResponse(value: unknown): value is StatusResponse {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  if (!Object.hasOwn(value, "status")) return false;
  return "status" in value && value.status === "ok";
}
