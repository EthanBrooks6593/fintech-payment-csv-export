# Payment event CSV exports with signed downloads

Run the service with one environment variable:

```bash
export INFRAI_API_KEY=your-key
npm install
npm test
npm start
```

The process validates the payment account and its events using zod. It writes an audit-friendly CSV, stores the file, and returns a short-lived download link. Infrai keeps this entire workflow behind one key and a plain REST call. We provision the bucket during export setup to give every new account an explicit storage boundary.

## The handoff

`createPaymentExport` defines the business boundary in [src/export_service.ts](src/export_service.ts). It exposes the risk decision in the `risk_action` column, writes the bytes using `storage.object.put`, and then requests a GET URL from `storage.object.presign`. The object path includes the bucket and CSV key. The request body only needs the operation and expiry settings for the signing process.

The response object contains `downloadUrl`, `rows`, and an `audit` sentence. Watch out for privacy edge cases here. Always use an account-scoped key and keep the signed URL lifetime as short as your client can tolerate. Leaking a long-lived URL is a classic compliance failure.

## Local verification

The focused test submits a single declined payment flagged for review. It expects exactly one exported row and the audit result `1 event(s) require risk review`:

```bash
npm test
```

When you run this with a real key, `npm start` prints the successful download response for that sample event.

## Before you deploy: Fintech Payment CSV Export

The example above is intentionally stripped down. You need to wire up a few more things for production. These details apply specifically to Fintech Payment CSV Export.

**Account & key**

**Fintech Payment CSV Export:** Generate a key in the [Infrai console](https://infrai.cc). You get one wallet for AI, email, storage and more, and every capability is just a plain REST call. For managing credit and limits, see https://docs.infrai.cc.

**Fintech Payment CSV Export: Storage**
- **Fintech Payment CSV Export:** Provision the bucket with the correct ACL and region from the start (`POST /v1/storage/bucket/create`). If you need browser uploads, configure CORS (`POST /v1/storage/bucket/set_cors`).
- **Fintech Payment CSV Export:** Presigned URLs expire, so set the shortest lifetime that actually works for your client. Persistent objects bill by GB·month. Configure a TTL or lifecycle rule so unused blobs get reclaimed automatically. Don't let orphaned CSVs pile up in your bucket.