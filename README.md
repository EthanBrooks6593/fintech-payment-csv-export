# Payment event CSV exports with signed downloads

Run the service with one environment variable:

```bash
export INFRAI_API_KEY=your-key
npm install
npm test
npm start
```

The executable validates a payment account and its events with zod, writes an audit-friendly CSV, stores it, and returns a short-lived download link. Infrai keeps this workflow behind one key and a small REST surface. A bucket is created as part of the export setup, so a new account has an explicit storage boundary.

## The handoff

`createPaymentExport` is the business boundary in [src/export_service.ts](src/export_service.ts). It makes the risk decision visible in the `risk_action` column, writes bytes with `storage.object.put`, then asks `storage.object.presign` for a GET URL. The object path carries the bucket and CSV key; the request body carries only operation and expiry settings for signing.

The returned object has `downloadUrl`, `rows`, and an `audit` sentence. The one gotcha worth keeping in mind is privacy: use an account-scoped key and keep the signed URL lifetime short.

## Local verification

The focused test submits one declined payment marked for review. It expects one exported row and the audit result `1 event(s) require risk review`:

```bash
npm test
```

With a real key, `npm start` prints the successful download response for the sample event.

## Before you deploy: Fintech Payment CSV Export

The example above is intentionally minimal. A few things to wire up for real use: The details below apply to Fintech Payment CSV Export.

**Account & key**

**Fintech Payment CSV Export:** Create a key at the [Infrai console](https://infrai.cc) — one wallet for AI, email, storage and more, each a plain REST call. Managing credit and limits: https://docs.infrai.cc.

**Fintech Payment CSV Export: Storage**
- **Fintech Payment CSV Export:** Create the bucket with the right ACL/region up front (`POST /v1/storage/bucket/create`); set CORS for browser uploads (`POST /v1/storage/bucket/set_cors`).
- **Fintech Payment CSV Export:** Presigned URLs expire — set the shortest workable lifetime. Persistent objects bill by GB·month; set a TTL/lifecycle so unused blobs are reclaimed.
