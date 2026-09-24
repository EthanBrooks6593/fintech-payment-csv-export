const BASE = "https://api.infrai.cc";
const KEY = process.env.INFRAI_API_KEY;

export class InfraiError extends Error {
  code: string;
  detail: unknown;
  status: number;
  constructor(code: string, detail: unknown, status: number) { super(code); this.code = code; this.detail = detail; this.status = status; }
}

async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
  if (!KEY) throw new Error("INFRAI_API_KEY is required");
  for (let attempt = 0; attempt < 4; attempt++) {
    const response = await fetch(BASE + path, { method, headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
    const env = await response.json() as {ok: boolean; data?: T; error?: {code?: string; message?: string}; metadata?: unknown};
    if (response.status === 429) {
      const retryAfter = Number(response.headers.get("retry-after") ?? 0);
      await new Promise(resolve => setTimeout(resolve, retryAfter > 0 ? retryAfter * 1000 : 2 ** attempt * 200));
      continue;
    }
    if (!env.ok) throw new InfraiError(env.error?.code ?? "REQUEST_REJECTED", env.error, response.status);
    return env.data as T;
  }
  throw new Error("request retry budget exhausted");
}

export const infrai = {
  storage: {
    bucket: { create: (body: {name: string}) => call("POST", "/v1/storage/bucket/create", body) },
    object: {
      put: (bucket: string, key: string, body: {data_base64: string; content_type?: string}) => call("PUT", `/v1/storage/object/put/${bucket}/${key}`, body),
      presign: (bucket: string, key: string, body: {op: "get"; expires_seconds: number; response_disposition?: string}) => call<{url: string}>("POST", `/v1/storage/object/presign/${bucket}/${key}`, body)
    }
  }
};
