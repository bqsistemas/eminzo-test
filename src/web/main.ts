import { mountStatus } from "./status.ts";

const container = document.getElementById("service-status");
if (container === null) throw new Error("the page has no #service-status region");
void mountStatus(container);
