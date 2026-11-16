import { isStatusResponse, STATUS_PATH, type StatusResponse } from "../shared/status.ts";

/** What the panel shows about the service. */
export type StatusView = "loading" | "working" | "unavailable";

export type LoadStatusOptions = {
  /** Origin of the service; without it the query goes to the page's own origin. */
  baseUrl?: string;
  fetch?: typeof fetch;
  /** The whole query (request and body) must settle within this time. */
  timeoutMs?: number;
};

export const DEFAULT_TIMEOUT_MS = 5_000;

const STATUS_TEXT: Readonly<Record<StatusView, string>> = {
  loading: "Checking the service…",
  working: "The service is working.",
  unavailable: "The service is unavailable.",
};

/**
 * Queries the service status once. It never rejects: a network error, a timeout, a non-2xx
 * answer or a body outside the contract all end as "unavailable".
 */
export async function loadStatus(opts: LoadStatusOptions = {}): Promise<StatusView> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<StatusView>((resolve) => {
    timer = setTimeout(() => {
      controller.abort();
      resolve("unavailable");
    }, opts.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  });
  try {
    return await Promise.race([query(opts, controller.signal), timeout]);
  } finally {
    clearTimeout(timer);
  }
}

async function query(opts: LoadStatusOptions, signal: AbortSignal): Promise<StatusView> {
  try {
    const url = opts.baseUrl === undefined ? STATUS_PATH : new URL(STATUS_PATH, opts.baseUrl).href;
    const fetchImpl = opts.fetch ?? globalThis.fetch;
    const response = await fetchImpl(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
      signal,
    });
    if (!response.ok) return "unavailable";
    const body: unknown = await response.json();
    return isStatusResponse(body) ? viewOf(body.status) : "unavailable";
  } catch {
    return "unavailable";
  }
}

function viewOf(status: StatusResponse["status"]): StatusView {
  switch (status) {
    case "ok":
      return "working";
    default: {
      // A new value in the contract fails the panel's type check here until it is handled.
      const unhandled: never = status;
      return unhandled;
    }
  }
}

/** Shows `view` in the status region, as text only. */
export function renderStatus(container: HTMLElement, view: StatusView): void {
  container.dataset.state = view;
  container.setAttribute("aria-busy", view === "loading" ? "true" : "false");
  container.textContent = STATUS_TEXT[view];
}

/** Shows "loading", queries the service once and shows the result. */
export async function mountStatus(container: HTMLElement, opts?: LoadStatusOptions): Promise<void> {
  renderStatus(container, "loading");
  renderStatus(container, await loadStatus(opts));
}
