import { createReadStream } from 'node:fs';
import {
  mkdir,
  open,
  readdir,
  readFile,
  rename,
  rm,
  stat,
  utimes,
  writeFile,
} from 'node:fs/promises';
import path from 'node:path';
import { Readable } from 'node:stream';

import {
  FILE_CACHE_MEDIA_HOST,
  FILE_CACHE_PROTOCOL_HOST,
  FILE_CACHE_PROTOCOL_SCHEME,
  fileProxyId,
  isFileProxyUrl,
  stableFileCacheUrl,
} from '@lobechat/const/protocol';
import { resolveMimeType } from '@lobechat/utils/mimeType';
import { app, net, type OnBeforeRequestListenerDetails, protocol, type Session } from 'electron';

import { createLogger } from '@/utils/logger';

const logger = createLogger('core:FileCacheProtocolManager');

const FILE_CACHE_PROTOCOL_PRIVILEGES = {
  allowServiceWorkers: false,
  bypassCSP: false,
  corsEnabled: true,
  secure: true,
  standard: true,
  stream: true,
  supportFetchAPI: true,
} as const;

const FILE_ID_PATTERN = /^[\w-]{1,128}$/;
const MAX_IMAGE_BYTES = 50 * 1024 * 1024;
const MAX_AV_BYTES = 512 * 1024 * 1024;
const DEFAULT_MAX_CACHE_BYTES = 2 * 1024 * 1024 * 1024;
const DEFAULT_REVALIDATE_INTERVAL_MS = 60 * 1000;
const PRIME_WAIT_MS = 3000;
const SNIFF_BYTES = 8192;
const TEMP_SUFFIX = '.tmp';
const META_SUFFIX = '.meta.json';
const PRUNE_DELAY_MS = 30 * 1000;
/** Failures of the disk copy, not of the file. A `/f/` image is then loaded without caching. */
const UNCACHEABLE_STATUSES = new Set([413, 415, 502]);

interface CacheMeta {
  etag?: string;
  lastModified?: string;
}

interface FileCacheProtocolManagerOptions {
  cacheDir: string;
  fetch?: (url: string, init?: RequestInit) => Promise<Response>;
  maxCacheBytes?: number;
  /** How often a mutable copy (an avatar) is checked with If-None-Match. File ids are never rechecked. */
  revalidateIntervalMs?: number;
}

export interface FileCacheStats {
  bytes: number;
  files: number;
}

/**
 * Custom `lobe-file-cache://` protocol that keeps a disk copy of remote media.
 *
 * - `lobe-file-cache://file/<file-id>/<name>` — a file id names immutable bytes. `?src=` is
 *   fetched only on a miss; a later signature is never requested.
 * - `lobe-file-cache://media/<hash>/<name>` — avatars and other URLs with no file id. The hash
 *   ignores the signature. A hit is served from disk, then checked with If-None-Match so an
 *   unchanged avatar is not downloaded again.
 *
 * `?prime=1&src=` records the latest signed URL and downloads only on a miss, without sending
 * the body back to that fetch. The element that displays the media uses the stable URL, so a
 * new signature does not throw away the decoded image. Video is served with range requests.
 *
 * `/f/<file-id>` images on the remote server are redirected here by {@link interceptFileProxy},
 * so an avatar or attachment that the renderer loads by its proxy URL is downloaded once per
 * file id instead of after every 302 and every new signature.
 */
export class FileCacheProtocolManager {
  private readonly cacheDir: string;

  private readonly fetchRemote: (url: string, init?: RequestInit) => Promise<Response>;

  private handlerRegistered = false;

  private readonly inFlight = new Map<string, Promise<Response | 'ready'>>();

  private readonly maxCacheBytes: number;

  private pruneTimer: NodeJS.Timeout | null = null;

  private readonly revalidateIntervalMs: number;

  private readonly revalidatedAt = new Map<string, number>();

  private readonly waiters = new Map<string, Array<() => void>>();

  constructor({
    cacheDir,
    fetch,
    maxCacheBytes,
    revalidateIntervalMs,
  }: FileCacheProtocolManagerOptions) {
    this.cacheDir = cacheDir;
    this.fetchRemote = fetch ?? ((url, init) => net.fetch(url, init));
    this.maxCacheBytes = maxCacheBytes ?? DEFAULT_MAX_CACHE_BYTES;
    this.revalidateIntervalMs = revalidateIntervalMs ?? DEFAULT_REVALIDATE_INTERVAL_MS;
  }

  get protocolScheme() {
    return {
      privileges: FILE_CACHE_PROTOCOL_PRIVILEGES,
      scheme: FILE_CACHE_PROTOCOL_SCHEME,
    };
  }

  registerHandler() {
    if (this.handlerRegistered) return;

    const register = () => {
      if (this.handlerRegistered) return;
      protocol.handle(FILE_CACHE_PROTOCOL_SCHEME, (request) => this.handleRequest(request));
      this.handlerRegistered = true;
      void this.prune().catch((error) => logger.warn('Failed to prune file cache:', error));
    };

    if (app.isReady()) register();
    else app.whenReady().then(register);
  }

  async handleRequest(request: Request): Promise<Response> {
    let url: URL;
    try {
      url = new URL(request.url);
    } catch {
      return new Response('Invalid URL', { status: 400 });
    }
    const mutable = url.hostname === FILE_CACHE_MEDIA_HOST;
    if (url.hostname !== FILE_CACHE_PROTOCOL_HOST && !mutable) {
      return new Response('Not Found', { status: 404 });
    }

    const [fileId, fileName] = this.parsePath(url.pathname);
    if (!fileId) return new Response('Invalid file id', { status: 400 });

    const filePath = path.join(this.cacheDir, fileId);
    const src = url.searchParams.get('src');
    const prime = url.searchParams.get('prime') === '1';
    const cached = await this.fileExists(filePath);

    if (cached) {
      const now = new Date();
      void utimes(filePath, now, now).catch(() => {});
      if (mutable && src) this.revalidate(fileId, filePath, src);
      if (prime) return this.empty(request);
      return this.respondFile(filePath, fileName, request, mutable);
    }

    // No signature yet: the displaying element can race the prime fetch. A non-http source is
    // rejected immediately so it cannot sit on the wait.
    if (!src) {
      const ready = await this.waitForReady(fileId);
      if (ready && (await this.fileExists(filePath))) {
        return this.respondFile(filePath, fileName, request, mutable);
      }
      return new Response('Not Found', { status: 404 });
    }
    if (!/^https?:\/\//i.test(src)) return new Response('Not Found', { status: 404 });

    const result = await this.joinDownload(fileId, filePath, src);
    // The proxy URL is all a redirected `<img>` has; if the disk copy cannot be made, load the
    // image uncached rather than show a broken avatar.
    if (
      result instanceof Response &&
      UNCACHEABLE_STATUSES.has(result.status) &&
      isFileProxyUrl(src)
    ) {
      return this.passthrough(src, request);
    }
    // Each waiter gets its own response. One shared body can only be read once.
    if (result instanceof Response) return result.clone();
    if (prime) return this.empty(request);
    return this.respondFile(filePath, fileName, request, mutable);
  }

  /**
   * Redirect the renderer's `/f/<file-id>` image loads on the remote server to the disk cache.
   * The 302 behind `/f/` is not cacheable, so without this every new `<img>` (switching a
   * conversation, remounting an avatar) went to the network, and a new signature downloaded
   * the bytes again. The redirect target is keyed by the file id and keeps the proxy URL as
   * `src`, so a miss is fetched by the main process, which follows the 302 itself.
   *
   * Only images from a page are redirected. The main process's own fetch has no web contents,
   * so it is not redirected back here. Video keeps streaming from the proxy: the cache downloads
   * a whole file before serving it. Electron keeps one `onBeforeRequest` listener per session,
   * so this owns the main window session's listener.
   */
  interceptFileProxy(session: Session, getRemoteBaseUrl: () => Promise<string | null | undefined>) {
    session.webRequest.onBeforeRequest({ urls: ['*://*/f/*'] }, (details, callback) => {
      void this.fileProxyRedirect(details, getRemoteBaseUrl)
        .catch((error) => {
          logger.warn('Failed to redirect file proxy request:', error);
          return null;
        })
        .then((redirectURL) => callback(redirectURL ? { redirectURL } : {}));
    });
  }

  /** The cache address for an intercepted `/f/` image, or `null` to let it through unchanged. */
  async fileProxyRedirect(
    details: Pick<
      OnBeforeRequestListenerDetails,
      'method' | 'resourceType' | 'url' | 'webContentsId'
    >,
    getRemoteBaseUrl: () => Promise<string | null | undefined>,
  ): Promise<string | null> {
    if (!details.webContentsId || details.resourceType !== 'image' || details.method !== 'GET') {
      return null;
    }
    const fileId = fileProxyId(details.url);
    if (!fileId || !FILE_ID_PATTERN.test(fileId)) return null;

    // The file id is the cache key, so only the server that issued it may fill that key.
    const remoteBaseUrl = await getRemoteBaseUrl();
    if (!remoteBaseUrl) return null;
    try {
      if (new URL(details.url).origin !== new URL(remoteBaseUrl).origin) return null;
    } catch {
      return null;
    }

    const target = new URL(stableFileCacheUrl({ id: fileId }));
    target.searchParams.set('src', details.url);
    return target.toString();
  }

  /** Total size and count of cached files, without partial downloads or validators. */
  async stats(): Promise<FileCacheStats> {
    const entries = await this.listEntries();
    return {
      bytes: entries.reduce((total, entry) => total + entry.size, 0),
      files: entries.length,
    };
  }

  /** Drop one file id's disk copy. The next load downloads it again. */
  async evict(fileId: string) {
    if (!FILE_ID_PATTERN.test(fileId)) return;
    const filePath = path.join(this.cacheDir, fileId);
    this.revalidatedAt.delete(fileId);
    await rm(filePath, { force: true });
    await rm(`${filePath}${META_SUFFIX}`, { force: true });
  }

  /**
   * Release the whole pool. Downloads still in flight keep their partial file and land
   * afterwards; leftovers from a crash are removed by {@link prune}.
   */
  async clear(): Promise<FileCacheStats> {
    const released = await this.stats();
    let names: string[];
    try {
      names = await readdir(this.cacheDir);
    } catch {
      return released;
    }
    await Promise.all(
      names
        .filter((name) => !name.endsWith(TEMP_SUFFIX))
        .map((name) => rm(path.join(this.cacheDir, name), { force: true, recursive: true })),
    );
    this.revalidatedAt.clear();
    return released;
  }

  /** Delete leftover partial downloads, then the least recently used files over the size cap. */
  async prune() {
    let names: string[];
    try {
      names = await readdir(this.cacheDir);
    } catch {
      return;
    }

    for (const name of names) {
      // `<file-id>.<pid>.<time>.tmp`. A download still running keeps its partial file.
      if (!name.endsWith(TEMP_SUFFIX) || this.inFlight.has(name.split('.')[0])) continue;
      await rm(path.join(this.cacheDir, name), { force: true });
    }
    const entries = await this.listEntries();

    entries.sort((a, b) => b.mtimeMs - a.mtimeMs);
    const kept = new Set<string>();
    let total = 0;
    for (const entry of entries) {
      total += entry.size;
      if (total > this.maxCacheBytes) {
        await rm(entry.path, { force: true });
        await rm(`${entry.path}${META_SUFFIX}`, { force: true });
      } else {
        kept.add(entry.name);
      }
    }

    for (const name of names) {
      if (!name.endsWith(META_SUFFIX)) continue;
      const dataName = name.slice(0, -META_SUFFIX.length);
      if (!kept.has(dataName)) await rm(path.join(this.cacheDir, name), { force: true });
    }
  }

  /** Cached files with their size and last use, skipping partial downloads and validators. */
  private async listEntries() {
    let names: string[];
    try {
      names = await readdir(this.cacheDir);
    } catch {
      return [];
    }

    const entries: { mtimeMs: number; name: string; path: string; size: number }[] = [];
    for (const name of names) {
      if (name.endsWith(TEMP_SUFFIX) || name.endsWith(META_SUFFIX)) continue;
      const entryPath = path.join(this.cacheDir, name);
      const entryStat = await stat(entryPath).catch(() => null);
      if (entryStat?.isFile()) {
        entries.push({ mtimeMs: entryStat.mtimeMs, name, path: entryPath, size: entryStat.size });
      }
    }
    return entries;
  }

  /**
   * Keep the pool under its cap during a long session, not only at launch. One trim runs a
   * while after a burst of downloads.
   */
  private schedulePrune() {
    if (this.pruneTimer) return;
    this.pruneTimer = setTimeout(() => {
      this.pruneTimer = null;
      void this.prune().catch((error) => logger.warn('Failed to prune file cache:', error));
    }, PRUNE_DELAY_MS);
    this.pruneTimer.unref?.();
  }

  /** Serve `src` straight from the network, for media the disk cache refused to keep. */
  private async passthrough(src: string, request: Request) {
    let response: Response;
    try {
      response = await this.fetchRemote(src);
    } catch (error) {
      logger.warn('Failed to load uncached file proxy media:', error);
      return new Response('Bad Gateway', { status: 502 });
    }
    const headers = this.corsHeaders(request);
    const contentType = response.headers.get('content-type');
    if (contentType) headers.set('Content-Type', contentType);
    headers.set('Content-Security-Policy', 'sandbox');
    headers.set('X-Content-Type-Options', 'nosniff');
    return new Response(response.body, { headers, status: response.status });
  }

  private async joinDownload(fileId: string, filePath: string, src: string) {
    let pending = this.inFlight.get(fileId);
    if (!pending) {
      pending = this.download(fileId, filePath, src).finally(() => this.inFlight.delete(fileId));
      this.inFlight.set(fileId, pending);
      this.arm(fileId);
    }
    return pending;
  }

  /**
   * An `<img>` can ask for the stable URL before the renderer's prime fetch delivers `src`.
   * Wait until that download starts, then share it, so the element does not 404 and stick.
   */
  private async waitForReady(fileId: string) {
    if (!this.inFlight.has(fileId)) await this.waitForStart(fileId);
    const pending = this.inFlight.get(fileId);
    if (!pending) return false;
    await pending.catch(() => undefined);
    return true;
  }

  private waitForStart(fileId: string) {
    return new Promise<void>((resolve) => {
      const timer = setTimeout(() => {
        const list = this.waiters.get(fileId);
        if (list)
          this.waiters.set(
            fileId,
            list.filter((item) => item !== wake),
          );
        resolve();
      }, PRIME_WAIT_MS);
      const wake = () => {
        clearTimeout(timer);
        resolve();
      };
      const list = this.waiters.get(fileId) ?? [];
      list.push(wake);
      this.waiters.set(fileId, list);
    });
  }

  private arm(fileId: string) {
    const list = this.waiters.get(fileId);
    if (!list) return;
    this.waiters.delete(fileId);
    for (const wake of list) wake();
  }

  private async download(
    fileId: string,
    filePath: string,
    src: string,
  ): Promise<Response | 'ready'> {
    let response: Response;
    try {
      response = await this.fetchRemote(src);
    } catch (error) {
      logger.warn(`Failed to download file ${fileId}:`, error);
      return new Response('Bad Gateway', { status: 502 });
    }

    // An expired signed URL answers 403; pass the failure through so the image shows its error state.
    if (!response.ok) return new Response(null, { status: response.status });

    const contentType = response.headers.get('content-type') ?? '';
    const limit = this.byteLimit(contentType);
    if (limit === null) return new Response('Unsupported Media Type', { status: 415 });
    if (Number(response.headers.get('content-length')) > limit) {
      return new Response('Payload Too Large', { status: 413 });
    }

    const body = response.body;
    if (!body) return new Response('Bad Gateway', { status: 502 });

    const tempPath = `${filePath}.${process.pid}.${Date.now()}${TEMP_SUFFIX}`;
    try {
      await mkdir(this.cacheDir, { recursive: true });
      const written = await this.writeBody(body, tempPath, limit);
      if (written === null) {
        await rm(tempPath, { force: true });
        return new Response('Payload Too Large', { status: 413 });
      }
      // Write then rename, so a crash never leaves a truncated file that later reads as a hit.
      await rename(tempPath, filePath);
      await this.writeMeta(filePath, {
        etag: response.headers.get('etag') ?? undefined,
        lastModified: response.headers.get('last-modified') ?? undefined,
      });
    } catch (error) {
      await rm(tempPath, { force: true }).catch(() => {});
      logger.warn(`Failed to cache file ${fileId}:`, error);
      return new Response('Bad Gateway', { status: 502 });
    }

    this.schedulePrune();
    return 'ready';
  }

  /** `null` when the body exceeds `limit` and the partial file must be discarded. */
  private async writeBody(body: ReadableStream<Uint8Array>, tempPath: string, limit: number) {
    const handle = await open(tempPath, 'w');
    const reader = body.getReader();
    let received = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) return received;
        if (!value) continue;
        received += value.byteLength;
        if (received > limit) {
          await reader.cancel().catch(() => {});
          return null;
        }
        let offset = 0;
        while (offset < value.byteLength) {
          // A single write may accept only part of the buffer.
          const { bytesWritten } = await handle.write(value, offset);
          if (bytesWritten <= 0) throw new Error('Failed to write cached media');
          offset += bytesWritten;
        }
      }
    } finally {
      reader.releaseLock();
      await handle.close();
    }
  }

  private byteLimit(contentType: string) {
    const type = contentType.toLowerCase();
    if (type.startsWith('image/')) return MAX_IMAGE_BYTES;
    if (type.startsWith('video/') || type.startsWith('audio/')) return MAX_AV_BYTES;
    return null;
  }

  private revalidate(fileId: string, filePath: string, src: string) {
    const now = Date.now();
    const last = this.revalidatedAt.get(fileId) ?? 0;
    if (now - last < this.revalidateIntervalMs) return;
    this.revalidatedAt.set(fileId, now);
    void this.revalidateNow(fileId, filePath, src).catch((error) => {
      logger.warn(`Failed to revalidate file ${fileId}:`, error);
    });
  }

  private async revalidateNow(fileId: string, filePath: string, src: string) {
    const meta = await this.readMeta(filePath);
    if (!meta?.etag && !meta?.lastModified) return;

    const headers = new Headers();
    if (meta.etag) headers.set('If-None-Match', meta.etag);
    else if (meta.lastModified) headers.set('If-Modified-Since', meta.lastModified);

    let response: Response;
    try {
      response = await this.fetchRemote(src, { headers });
    } catch (error) {
      logger.warn(`Failed to revalidate file ${fileId}:`, error);
      return;
    }

    // 304, or an expired signature: keep the disk copy. The element is already showing it.
    if (response.status === 304 || !response.ok) return;
    const limit = this.byteLimit(response.headers.get('content-type') ?? '');
    if (limit === null || !response.body) return;

    const tempPath = `${filePath}.${process.pid}.${Date.now()}${TEMP_SUFFIX}`;
    const written = await this.writeBody(response.body, tempPath, limit);
    if (written === null) {
      await rm(tempPath, { force: true });
      return;
    }
    try {
      await rename(tempPath, filePath);
      await this.writeMeta(filePath, {
        etag: response.headers.get('etag') ?? meta.etag,
        lastModified: response.headers.get('last-modified') ?? meta.lastModified,
      });
    } catch (error) {
      await rm(tempPath, { force: true }).catch(() => {});
      logger.warn(`Failed to replace cached file ${fileId}:`, error);
    }
  }

  private async readMeta(filePath: string): Promise<CacheMeta | null> {
    try {
      const parsed: unknown = JSON.parse(await readFile(`${filePath}${META_SUFFIX}`, 'utf8'));
      if (!parsed || typeof parsed !== 'object') return null;
      const record = parsed as CacheMeta;
      return {
        etag: typeof record.etag === 'string' ? record.etag : undefined,
        lastModified: typeof record.lastModified === 'string' ? record.lastModified : undefined,
      };
    } catch {
      return null;
    }
  }

  private async writeMeta(filePath: string, meta: CacheMeta) {
    if (!meta.etag && !meta.lastModified) return;
    await writeFile(`${filePath}${META_SUFFIX}`, JSON.stringify(meta));
  }

  private async fileExists(filePath: string) {
    const info = await stat(filePath).catch(() => null);
    return !!info?.isFile();
  }

  /** Returns `[fileId, fileName]`, with a null id when the path does not name a valid one. */
  private parsePath(pathname: string): [string | null, string] {
    const [idSegment = '', nameSegment = ''] = pathname.replace(/^\/+/, '').split('/');
    try {
      const fileId = decodeURIComponent(idSegment);
      const fileName = decodeURIComponent(nameSegment) || fileId;
      return [FILE_ID_PATTERN.test(fileId) ? fileId : null, fileName];
    } catch {
      return [null, ''];
    }
  }

  private empty(request: Request) {
    return new Response(null, { headers: this.corsHeaders(request), status: 204 });
  }

  private async respondFile(
    filePath: string,
    fileName: string,
    request: Request,
    mutable: boolean,
  ) {
    const info = await stat(filePath);
    const total = info.size;
    const meta = mutable ? await this.readMeta(filePath) : null;
    const etag = meta?.etag;
    // A mutable copy (an avatar) can be replaced in place. Within the max-age the decoded
    // image stays put while switching views. After that the browser rechecks; a matching
    // validator answers 304, so an unchanged image is not transferred. mtime is not a
    // validator: every hit touches it so the least-recently-used trim stays honest.
    if (mutable && etag && request.headers.get('if-none-match') === etag) {
      return new Response(null, {
        headers: this.corsHeaders(request, { ETag: etag }),
        status: 304,
      });
    }
    const range = this.parseRange(request.headers.get('range'), total);
    if (range === 'invalid') {
      return new Response(null, {
        headers: this.corsHeaders(request, { 'Content-Range': `bytes */${total}` }),
        status: 416,
      });
    }

    const start = range?.start ?? 0;
    const end = range?.end ?? Math.max(0, total - 1);
    const head = await this.readHead(filePath);
    const sniffed = await resolveMimeType(fileName, head);
    const playable = /^(?:image|video|audio)\//.test(sniffed);
    const headers = this.corsHeaders(request);
    headers.set('Content-Type', playable ? sniffed : 'application/octet-stream');
    headers.set('Content-Security-Policy', 'sandbox');
    headers.set('Accept-Ranges', 'bytes');
    headers.set('X-Content-Type-Options', 'nosniff');
    if (etag) headers.set('ETag', etag);
    headers.set(
      'Cache-Control',
      mutable ? 'private, max-age=60, must-revalidate' : 'private, max-age=31536000, immutable',
    );

    if (total === 0) {
      headers.set('Content-Length', '0');
      return new Response(null, { headers, status: 200 });
    }

    const length = end - start + 1;
    headers.set('Content-Length', String(length));
    if (range) headers.set('Content-Range', `bytes ${start}-${end}/${total}`);
    const stream = Readable.toWeb(
      createReadStream(filePath, { end, start }),
    ) as ReadableStream<Uint8Array>;
    return new Response(stream, { headers, status: range ? 206 : 200 });
  }

  private async readHead(filePath: string) {
    const handle = await open(filePath, 'r');
    try {
      const buffer = Buffer.alloc(SNIFF_BYTES);
      const { bytesRead } = await handle.read(buffer, 0, SNIFF_BYTES, 0);
      return buffer.subarray(0, bytesRead);
    } finally {
      await handle.close();
    }
  }

  private parseRange(header: string | null, total: number) {
    if (!header || total <= 0) return null;
    if (!header.startsWith('bytes=') || header.includes(',')) return null;
    const match = /^(\d*)-(\d*)$/.exec(header.slice('bytes='.length).trim());
    if (!match) return 'invalid' as const;
    const [, startText, endText] = match;
    if (startText === '' && endText === '') return 'invalid' as const;

    if (startText === '') {
      const suffix = Number(endText);
      if (!Number.isFinite(suffix) || suffix <= 0) return 'invalid' as const;
      return { end: total - 1, start: Math.max(0, total - suffix) };
    }

    const start = Number(startText);
    const end = endText === '' ? total - 1 : Number(endText);
    if (
      !Number.isFinite(start) ||
      !Number.isFinite(end) ||
      start < 0 ||
      end < start ||
      start >= total
    ) {
      return 'invalid' as const;
    }
    return { end: Math.min(end, total - 1), start };
  }

  private corsHeaders(request: Request, extra?: HeadersInit) {
    const headers = new Headers(extra);
    // The renderer's download action fetches the image; a sandboxed preview (Origin: null) may not.
    const origin = request.headers.get('origin');
    if (origin && origin !== 'null') headers.set('Access-Control-Allow-Origin', origin);
    return headers;
  }
}
