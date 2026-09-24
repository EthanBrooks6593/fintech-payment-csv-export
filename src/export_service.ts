import { z } from "zod";
import { infrai } from "./infrai.js";

const BUCKET = "payment-reports";
const requestSchema = z.object({accountId: z.string().min(1), events: z.array(z.object({id: z.string(), occurredAt: z.string(), amountCents: z.number().int(), currency: z.string(), status: z.enum(["authorized", "settled", "declined"]), riskAction: z.enum(["allow", "review", "block"])})).min(1)});
export type ExportRequest = z.infer<typeof requestSchema>;

function csv(request: ExportRequest): string {
  const rows = request.events.map(event => [event.id, request.accountId, event.occurredAt, event.amountCents, event.currency, event.status, event.riskAction].join(","));
  return ["event_id,account_id,occurred_at,amount_cents,currency,status,risk_action", ...rows].join("\n") + "\n";
}

export async function createPaymentExport(input: unknown): Promise<{downloadUrl: string; rows: number; audit: string}> {
  const request = requestSchema.parse(input);
  const key = `exports/${request.accountId}-${Date.now()}.csv`;
  await infrai.storage.bucket.create({name: BUCKET});
  await infrai.storage.object.put(BUCKET, key, {data_base64: Buffer.from(csv(request)).toString("base64"), content_type: "text/csv"});
  const signed = await infrai.storage.object.presign(BUCKET, key, {op: "get", expires_seconds: 300, response_disposition: `attachment; filename="${request.accountId}-payments.csv"`});
  const reviewed = request.events.filter(event => event.riskAction !== "allow").length;
  return {downloadUrl: signed.url, rows: request.events.length, audit: `${reviewed} event(s) require risk review`};
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const sample: ExportRequest = {accountId: "acct_demo", events: [{id: "pay_001", occurredAt: "2026-09-10T09:00:00Z", amountCents: 1250, currency: "USD", status: "settled", riskAction: "allow"}]};
  createPaymentExport(sample).then(result => console.log(JSON.stringify(result, null, 2))).catch(error => { console.error(error); process.exitCode = 1; });
}
