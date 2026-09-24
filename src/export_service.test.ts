import assert from "node:assert/strict";
import { createPaymentExport } from "./export_service.js";

const originalFetch = globalThis.fetch;
const calls: Array<{path: string; body?: any}> = [];
globalThis.fetch = async (url, init) => { calls.push({path: new URL(url).pathname, body: init?.body ? JSON.parse(String(init.body)) : undefined}); return new Response(JSON.stringify({ok: true, data: {url: "https://download.example/report.csv"}}), {status: 200, headers: {"content-type": "application/json"}}); };
const result = await createPaymentExport({accountId: "acct_test", events: [{id: "p1", occurredAt: "2026-01-01", amountCents: 900, currency: "USD", status: "declined", riskAction: "review"}]});
assert.equal(result.rows, 1);
assert.equal(result.audit, "1 event(s) require risk review");
assert.equal(calls.some(call => call.path.includes("/presign/acct")), false);
assert.equal(calls.at(-1)?.body?.op, "get");
globalThis.fetch = originalFetch;
console.log("export decision test passed");
