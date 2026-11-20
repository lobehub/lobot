import { mkdtemp, readdir, rm, utimes, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it, type Mock, vi } from 'vitest';

import { FileCacheProtocolManager } from '../FileCacheProtocolManager';

vi.mock('electron', () => ({
  app: { isReady: () => true, whenReady: () => Promise.resolve() },
  net: { fetch: vi.fn() },
  protocol: { handle: vi.fn() },
}));

// A 1x1 PNG, so the served type is sniffed from real bytes.
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  'base64',
);

const SIGNED_URL = 'https://s3.example.com/files/a.png?X-Amz-Expires=300&X-Amz-Signature=abc';

const imageResponse = (body: Buffer = PNG) =>
  new Response(new Uint8Array(body), { headers: { 'content-type': 'image/png' }, status: 200 });

const request = (fileId: string, src = SIGNED_URL) =>
  new Request(`lobe-file-cache://file/${fileId}/a.png?src=${encodeURIComponent(src)}`);

type RemoteFetch = (url: string, init?: RequestInit) => Promise<Response>;

describe('FileCacheProtocolManager', () => {
  let cacheDir: string;
  let fetchRemote: Mock<RemoteFetch>;
  let manager: FileCacheProtocolManager;

  beforeEach(async () => {
    cacheDir = await mkdtemp(path.join(tmpdir(), 'file-cache-'));
    fetchRemote = vi.fn<RemoteFetch>();
    manager = new FileCacheProtocolManager({ cacheDir, fetch: fetchRemote });
  });

  afterEach(async () => {
    await rm(cacheDir, { force: true, recursive: true });
  });

  it('serves a cached image after its signed URL has expired', async () => {
    fetchRemote.mockResolvedValueOnce(imageResponse());
    const first = await manager.handleRequest(request('file_AbC'));
    expect(first.status).toBe(200);

    // The persisted conversation still carries the old URL, which S3 now rejects.
    fetchRemote.mockResolvedValue(new Response('expired', { status: 403 }));
    const reopened = await manager.handleRequest(request('file_AbC'));

    expect(reopened.status).toBe(200);
    expect(reopened.headers.get('content-type')).toBe('image/png');
    expect(Buffer.from(await reopened.arrayBuffer())).toEqual(PNG);
    expect(fetchRemote).toHaveBeenCalledTimes(1);
  });

  it('passes an expired URL through as an error when the image was never cached', async () => {
    fetchRemote.mockResolvedValue(new Response('expired', { status: 403 }));

    const response = await manager.handleRequest(request('file_1'));

    expect(response.status).toBe(403);
    expect(await readdir(cacheDir)).toEqual([]);
  });

  it('downloads a file once for concurrent requests', async () => {
    fetchRemote.mockResolvedValue(imageResponse());

    const responses = await Promise.all([
      manager.handleRequest(request('file_1')),
      manager.handleRequest(request('file_1')),
    ]);

    expect(responses.map((response) => response.status)).toEqual([200, 200]);
    expect(fetchRemote).toHaveBeenCalledTimes(1);
  });

  it('refuses to cache a non-image response', async () => {
    fetchRemote.mockResolvedValue(
      new Response('<script>', { headers: { 'content-type': 'text/html' }, status: 200 }),
    );

    const response = await manager.handleRequest(request('file_1'));

    expect(response.status).toBe(415);
    expect(await readdir(cacheDir)).toEqual([]);
  });

  it('rejects ids that could leave the cache directory and non-http sources', async () => {
    expect((await manager.handleRequest(request('..%2Fescape'))).status).toBe(400);
    expect((await manager.handleRequest(request('file_1', 'file:///etc/passwd'))).status).toBe(404);
    expect(fetchRemote).not.toHaveBeenCalled();
  });

  it('serves an opaque type when cached bytes are not an image', async () => {
    await writeFile(path.join(cacheDir, 'file_1'), '<html><script>alert(1)</script></html>');

    const response = await manager.handleRequest(
      new Request('lobe-file-cache://file/file_1/page.html'),
    );

    expect(response.headers.get('content-type')).toBe('application/octet-stream');
  });

  it('serves a cached video with a byte range and does not download it again', async () => {
    const video = Buffer.from([
      0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, 0x6d, 0x70, 0x34, 0x32,
    ]);
    fetchRemote.mockResolvedValueOnce(
      new Response(new Uint8Array(video), {
        headers: { 'content-type': 'video/mp4' },
        status: 200,
      }),
    );

    const full = await manager.handleRequest(
      new Request(`lobe-file-cache://file/file_V/demo.mp4?src=${encodeURIComponent(SIGNED_URL)}`),
    );
    expect(full.status).toBe(200);
    expect(full.headers.get('content-type')).toBe('video/mp4');
    expect(full.headers.get('accept-ranges')).toBe('bytes');

    const ranged = await manager.handleRequest(
      new Request('lobe-file-cache://file/file_V/demo.mp4', { headers: { range: 'bytes=0-3' } }),
    );

    expect(ranged.status).toBe(206);
    expect(ranged.headers.get('content-range')).toBe(`bytes 0-3/${video.length}`);
    expect(Buffer.from(await ranged.arrayBuffer())).toEqual(video.subarray(0, 4));
    expect(fetchRemote).toHaveBeenCalledTimes(1);
  });

  it('primes a cached file without sending its body again', async () => {
    fetchRemote.mockResolvedValueOnce(imageResponse());
    await manager.handleRequest(request('file_1'));

    const prime = await manager.handleRequest(
      new Request(
        `lobe-file-cache://file/file_1/a.png?prime=1&src=${encodeURIComponent(SIGNED_URL)}`,
      ),
    );

    expect(prime.status).toBe(204);
    expect(prime.body).toBeNull();
    // A file id is immutable, so the fresh signature is not fetched.
    expect(fetchRemote).toHaveBeenCalledTimes(1);
  });

  it('serves an element that asks before the signed URL is primed', async () => {
    let resolveDownload: (response: Response) => void = () => {};
    fetchRemote.mockReturnValue(
      new Promise((resolve) => {
        resolveDownload = resolve;
      }),
    );

    const displayed = manager.handleRequest(new Request('lobe-file-cache://file/file_1/a.png'));
    const prime = manager.handleRequest(request('file_1'));
    resolveDownload(imageResponse());

    expect((await prime).status).toBe(200);
    expect(Buffer.from(await (await displayed).arrayBuffer())).toEqual(PNG);
    expect(fetchRemote).toHaveBeenCalledTimes(1);
  });

  it('rechecks a mutable avatar with its validator and keeps the disk copy on 304', async () => {
    manager = new FileCacheProtocolManager({
      cacheDir,
      fetch: fetchRemote,
      revalidateIntervalMs: 0,
    });
    const hash = 'a'.repeat(64);
    const prime = (signature: string) =>
      new Request(
        `lobe-file-cache://media/${hash}/a.png?prime=1&src=${encodeURIComponent(`https://cdn.example.com/avatars/a.png?X-Amz-Signature=${signature}`)}`,
      );

    fetchRemote.mockResolvedValueOnce(
      new Response(new Uint8Array(PNG), {
        headers: { 'content-type': 'image/png', 'etag': '"v1"' },
        status: 200,
      }),
    );
    expect((await manager.handleRequest(prime('one'))).status).toBe(204);

    fetchRemote.mockResolvedValueOnce(new Response(null, { status: 304 }));
    expect((await manager.handleRequest(prime('two'))).status).toBe(204);
    await vi.waitFor(() => expect(fetchRemote).toHaveBeenCalledTimes(2));
    const headers = fetchRemote.mock.calls[1]?.[1]?.headers as Headers;
    expect(headers.get('If-None-Match')).toBe('"v1"');

    const shown = await manager.handleRequest(new Request(`lobe-file-cache://media/${hash}/a.png`));
    expect(Buffer.from(await shown.arrayBuffer())).toEqual(PNG);
  });

  it('trims least recently used files over the cap and partial downloads', async () => {
    manager = new FileCacheProtocolManager({ cacheDir, fetch: fetchRemote, maxCacheBytes: 10 });
    const old = new Date('2026-01-01');
    await writeFile(path.join(cacheDir, 'old'), Buffer.alloc(6));
    await utimes(path.join(cacheDir, 'old'), old, old);
    await writeFile(path.join(cacheDir, 'recent'), Buffer.alloc(6));
    await writeFile(path.join(cacheDir, 'recent.1.2.tmp'), Buffer.alloc(1));

    await manager.prune();

    expect(await readdir(cacheDir)).toEqual(['recent']);
  });
});
