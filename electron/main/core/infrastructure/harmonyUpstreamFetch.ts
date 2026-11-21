import type { IncomingHttpHeaders } from 'node:http';
import { request as httpRequest } from 'node:http';
import { request as httpsRequest } from 'node:https';
import { Readable } from 'node:stream';

/**
 * HarmonyOS-only upstream fetch.
 *
 * On the OpenHarmony Electron port every Chromium-backed request issued from the
 * main process is turned into a CORS-mode load without an initiator and rejected
 * (`net::ERR_INVALID_ARGUMENT` + "cors without initiator"), which breaks every
 * tRPC call. `net.fetch` and the global `fetch` both end up there.
 *
 * `node:https` talks to the same endpoints directly, so the backend proxy uses
 * this on HarmonyOS. Responses are buffered: tRPC payloads are small JSON blobs.
 */
export const harmonyUpstreamFetch = async (
  url: string,
  init: RequestInit & { duplex?: 'half' },
): Promise<Response> => {
  // The proxy hands us `request.body`, which undici exposes as a web
  // `ReadableStream` — it has `getReader()` but no `.pipe()`. Classifying it as
  // "not a stream" used to drop the body silently, so every POST reached the
  // backend with an empty payload: writes failed input validation (zod
  // `invalid_type`) while reads kept working. Buffer it instead; tRPC payloads
  // are small JSON blobs, and a buffered body also lets us set content-length.
  const bufferedBody = await normalizeBody(init.body as any);

  return new Promise((resolve, reject) => {
    const target = new URL(url);
    const isHttps = target.protocol === 'https:';
    const headers: Record<string, string> = {};

    const source = init.headers as any;
    const entries: [string, string][] = source instanceof Headers
      ? [...source.entries()]
      : Array.isArray(source)
        ? source
        : Object.entries(source ?? {});

    for (const [key, value] of entries) {
      const lower = String(key).toLowerCase();
      // Hop-by-hop / length headers are recomputed by node itself.
      if (['connection', 'content-length', 'host', 'transfer-encoding'].includes(lower)) continue;
      headers[key] = String(value);
    }

    const body = bufferedBody as any;
    const isStream = body && typeof body.pipe === 'function';
    const isBuffer = Buffer.isBuffer(body);
    const payload = isBuffer ? body : typeof body === 'string' ? Buffer.from(body) : undefined;

    if (payload) headers['content-length'] = String(payload.byteLength);

    // Keep the response uncompressed: we hand raw bytes back to Chromium, which
    // would otherwise receive gzip without the matching content-encoding we drop.
    headers['accept-encoding'] = 'identity';

    const requestFn = isHttps ? httpsRequest : httpRequest;
    const req = requestFn(
      {
        headers,
        hostname: target.hostname,
        method: (init.method as string) || 'GET',
        path: `${target.pathname}${target.search}`,
        port: target.port || (isHttps ? 443 : 80),
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
        res.on('end', () => {
          const responseHeaders = new Headers();
          for (const [key, value] of Object.entries(res.headers as IncomingHttpHeaders)) {
            if (value === undefined) continue;
            if (Array.isArray(value)) value.forEach((v) => responseHeaders.append(key, v));
            else responseHeaders.set(key, String(value));
          }
          // body bytes are already decoded; drop the encoding/length hints
          responseHeaders.delete('content-encoding');
          responseHeaders.delete('content-length');
          responseHeaders.delete('transfer-encoding');

          resolve(new Response(chunks.length ? Buffer.concat(chunks) : null, {
            headers: responseHeaders,
            status: res.statusCode ?? 500,
            statusText: res.statusMessage ?? '',
          }));
        });
        res.on('error', reject);
      },
    );

    req.on('error', reject);
    req.setTimeout(30_000, () => req.destroy(new Error('upstream request timed out')));

    if (isStream) {
      Readable.fromWeb(body as any).pipe(req);
    } else if (payload) {
      req.end(payload);
    } else {
      req.end();
    }
  });
};

/**
 * Turn whatever `fetch` received as a request body into something node's
 * `http.request` can write in one shot: a Buffer, a string, or a node stream.
 * A web `ReadableStream` — what `Request.body` gives us — has `getReader()` but
 * no `.pipe()`, so it is drained into a Buffer here.
 */
const normalizeBody = async (body: unknown): Promise<unknown> => {
  if (!body) return undefined;
  if (Buffer.isBuffer(body) || typeof body === 'string') return body;
  if (body instanceof ArrayBuffer) return Buffer.from(body);
  if (ArrayBuffer.isView(body)) {
    const view = body as ArrayBufferView;
    return Buffer.from(view.buffer, view.byteOffset, view.byteLength);
  }
  if (typeof (body as any).getReader === 'function') {
    return Buffer.from(await new Response(body as any).arrayBuffer());
  }
  return body;
};
