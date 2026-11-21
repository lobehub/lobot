import { createServer, type IncomingMessage, type Server } from 'node:http';

import { createLogger } from '@/utils/logger';

const logger = createLogger('core:HarmonyRendererServer');

/**
 * Port the renderer is served on under HarmonyOS. Fixed on purpose: the
 * renderer URL is resolved while `RendererUrlManager` is being constructed,
 * before an ephemeral `listen(0)` could report its port back.
 */
export const HARMONY_RENDERER_PORT = 38080;

const HOP_BY_HOP = new Set([
  'connection',
  'content-length',
  'host',
  'keep-alive',
  'origin',
  'referer',
  'proxy-authenticate',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
]);

/**
 * HarmonyOS port workaround: `fetch()` on a custom scheme (`app://renderer`)
 * fails with `URL scheme "app" is not supported`, because the port does not
 * implement `supportFetchAPI` for `protocol.handle` schemes. Every tRPC call
 * therefore failed and the UI fell back to empty data.
 *
 * Serving the same request pipeline over a real loopback HTTP origin makes
 * `fetch`, relative URLs, cookies and secure-context features work exactly as
 * they do on desktop Electron.
 */
export class HarmonyRendererServer {
  private server: Server | null = null;
  private port = HARMONY_RENDERER_PORT;

  /** The origin the window should load, e.g. `http://127.0.0.1:38080`. */
  get origin() {
    return `http://127.0.0.1:${this.port}`;
  }

  start(handler: (request: Request) => Promise<Response>, preferredPort = HARMONY_RENDERER_PORT) {
    if (this.server) return;

    this.port = preferredPort;
    this.server = createServer((req, res) => {
      void this.handle(req, res, handler);
    });
    this.server.on('error', (error: NodeJS.ErrnoException) => {
      logger.error('Harmony renderer server error:', error);
    });
    this.server.listen(this.port, '127.0.0.1', () => {
      logger.info(`Harmony renderer server listening on ${this.origin}`);
    });
  }

  private async handle(
    req: IncomingMessage,
    res: import('node:http').ServerResponse,
    handler: (request: Request) => Promise<Response>,
  ) {
    try {
      const headers = new Map<string, string>();
      for (const [key, value] of Object.entries(req.headers)) {
        if (HOP_BY_HOP.has(key) || value === undefined) continue;
        // Browser-side fetch metadata must not be replayed upstream: forwarding
        // `sec-fetch-mode: cors` makes Chromium treat the main-process request
        // as CORS with an unknown initiator and reject it (net::ERR_INVALID_ARGUMENT).
        if (key.startsWith('sec-fetch') || key.startsWith('sec-ch-ua')) continue;
        headers.set(key, Array.isArray(value) ? value.join(',') : String(value));
      }

      const method = req.method || 'GET';
      const hasBody = method !== 'GET' && method !== 'HEAD';
      // Buffer the body: Electron's `net.fetch` rejects streamed request bodies
      // coming from a Node request (net::ERR_INVALID_ARGUMENT).
      const requestBody = hasBody ? await readBody(req) : undefined;

      // The request must carry a real http origin: Chromium rejects a CORS
      // request whose initiator is a non-http URL (`request_initiator is not a
      // valid origin` → net::ERR_INVALID_ARGUMENT) when the proxy forwards it.
      const request = new Request(`${this.origin}${req.url ?? '/'}`, {
        body: requestBody,
        // @ts-expect-error Node's fetch accepts a plain object here
        headers: Object.fromEntries(headers),
        method,
      } as any);

      const response = await handler(request);
      const responseBody = Buffer.from(await response.arrayBuffer());

      const outHeaders: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        if (!HOP_BY_HOP.has(key.toLowerCase())) outHeaders[key] = value;
      });
      // Allow the renderer (same origin in practice) to call the loopback origin.
      outHeaders['access-control-allow-origin'] = '*';

      res.writeHead(response.status, outHeaders);
      res.end(responseBody);
    } catch (error: any) {
      logger.error('Harmony renderer server failed on ' + req.url, error);
      if (!res.headersSent) res.writeHead(500, { 'content-type': 'text/plain' });
      res.end('Internal error: ' + (error?.message ?? error));
    }
  }
}

const readBody = (req: IncomingMessage): Promise<Buffer> =>
  new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });

export const harmonyRendererServer = new HarmonyRendererServer();
