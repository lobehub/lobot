import { sha256Hex } from './sha256';

/**
 * Custom protocol the desktop main process exposes for serving approved
 * local workspace file previews to the renderer.
 * Backed by `LocalFileProtocolManager` in
 * `apps/desktop`.
 */
export const LOCAL_FILE_PROTOCOL_SCHEME = 'localfile';
export const LOCAL_FILE_PROTOCOL_HOST = 'file';

/**
 * Build a `localfile://file/<abs-path>` URL from an absolute filesystem path.
 *
 * The desktop protocol handler requires a main-process authorization token
 * before serving bytes. Renderer preview code should request that URL through
 * desktop IPC instead of using this helper directly.
 *
 * - POSIX  `/Users/a/img.png`     -> `localfile://file/Users/a/img.png`
 * - Win32  `C:\\Users\\a\\img.png` -> `localfile://file/C:/Users/a/img.png`
 *
 * Each path segment is percent-encoded so spaces / unicode / `?` / `#`
 * survive the URL round-trip. The `/` separator itself is preserved.
 * Returns `null` when the input is empty or not an absolute path.
 */
export const buildLocalFileUrl = (absolutePath: string | null | undefined): string | null => {
  if (!absolutePath) return null;

  // Normalize Windows backslashes so the URL pathname uses forward slashes.
  const forwardSlashed = absolutePath.replaceAll('\\', '/');

  const isWindowsAbsolute = /^[a-z]:\//i.test(forwardSlashed);
  const isPosixAbsolute = forwardSlashed.startsWith('/');
  if (!isWindowsAbsolute && !isPosixAbsolute) return null;

  // Drop the leading slash on POSIX paths so we get exactly one `/` between
  // host and the encoded path (the protocol handler re-adds it).
  const stripped = isPosixAbsolute ? forwardSlashed.slice(1) : forwardSlashed;

  const encoded = stripped.split('/').map(encodeURIComponent).join('/');

  return `${LOCAL_FILE_PROTOCOL_SCHEME}://${LOCAL_FILE_PROTOCOL_HOST}/${encoded}`;
};

/**
 * Desktop protocol that keeps a disk copy of remote media. `file` is keyed by an immutable file
 * id; `media` is keyed by the resource itself, ignoring the rotating signature on its URL.
 * Backed by `FileCacheProtocolManager` in `electron`.
 */
export const FILE_CACHE_PROTOCOL_SCHEME = 'lobe-file-cache';
export const FILE_CACHE_PROTOCOL_HOST = 'file';
/** Avatars and other remote media whose URL has no file id. The host stays lowercase. */
export const FILE_CACHE_MEDIA_HOST = 'media';

/**
 * Query keys that authenticate a signed URL or change the response disposition, not the bytes.
 * Two signatures of one object must share a cache key. Size and format params stay, so a
 * thumbnail does not collide with the original.
 */
const SIGNING_QUERY =
  /^(?:x-amz-|x-goog-|response-content-|awsaccesskeyid$|signature$|expires$|security-token$)/i;

const compareQuery = (left: [string, string], right: [string, string]) => {
  if (left[0] !== right[0]) return left[0] < right[0] ? -1 : 1;
  if (left[1] === right[1]) return 0;
  return left[1] < right[1] ? -1 : 1;
};

/**
 * Origin, path, and the query params that select bytes. `null` when `url` is not http(s).
 * A new `X-Amz-Signature` does not change the result; a new path or `?w=` does.
 */
export const stableMediaIdentity = (url: string): string | null => {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;

  const kept: [string, string][] = [];
  for (const [key, value] of parsed.searchParams) {
    if (!SIGNING_QUERY.test(key)) kept.push([key, value]);
  }
  kept.sort(compareQuery);
  const query = kept
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join('&');
  return `${parsed.origin}${parsed.pathname}${query ? `?${query}` : ''}`;
};

const FILE_PROXY_PATH = /^\/f\/([^/]+)(?:\/raw)?\/?$/;

/**
 * The app's `/f/:id` proxy. The renderer keeps loading it by URL; on desktop the main process
 * intercepts image and video loads of it and answers from the disk cache by file id.
 */
export const isFileProxyUrl = (url: string): boolean => fileProxyId(url) !== null;

/** File id of a `/f/:id` proxy URL, or `null` when `url` is not one. */
export const fileProxyId = (url: string): string | null => {
  try {
    const match = FILE_PROXY_PATH.exec(new URL(url).pathname);
    return match ? decodeURIComponent(match[1]) : null;
  } catch {
    return null;
  }
};

const cacheObjectName = (name: string | undefined, fallback: string): string => {
  const base = (name || fallback).split(/[/\\]/).pop() || fallback;
  return base.slice(0, 120) || fallback;
};

/**
 * `lobe-file-cache://file/<id>/<name>` with no query. The signed URL must not be part of the
 * address an `<img>` or `<video>` loads, or a new signature is a new resource and the decoded
 * image is thrown away. The latest signature is delivered separately, and only fetched on a miss.
 */
export const stableFileCacheUrl = ({ id, name }: { id: string; name?: string }): string => {
  const fileName = cacheObjectName(name, id);
  return `${FILE_CACHE_PROTOCOL_SCHEME}://${FILE_CACHE_PROTOCOL_HOST}/${encodeURIComponent(id)}/${encodeURIComponent(fileName)}`;
};

/**
 * `lobe-file-cache://media/<hash>/<name>` for a remote URL with no file id. The hash is the
 * stable identity, so a new signature hits the same disk copy.
 */
export const stableMediaCacheUrl = (url: string): string | null => {
  const identity = stableMediaIdentity(url);
  if (!identity) return null;

  let base = 'media';
  try {
    const last = new URL(url).pathname.split('/').pop();
    if (last) base = decodeURIComponent(last);
  } catch {
    // `stableMediaIdentity` already rejected URLs that do not parse.
  }

  return `${FILE_CACHE_PROTOCOL_SCHEME}://${FILE_CACHE_MEDIA_HOST}/${sha256Hex(identity)}/${encodeURIComponent(cacheObjectName(base, 'media'))}`;
};

/** Asks the disk cache to remember `src` and download it only when that key is missing. */
export const fileCachePrimeUrl = (stable: string, src: string): string => {
  const primed = new URL(stable);
  primed.searchParams.set('src', src);
  primed.searchParams.set('prime', '1');
  return primed.toString();
};

/**
 * Build `lobe-file-cache://file/<id>/<name>?src=<url>`. Prefer {@link stableFileCacheUrl}: this
 * form puts the signed URL in the address, so a new signature misses the renderer's image cache.
 * Kept for callers that still hand the source to the protocol in the same request.
 */
export const buildFileCacheUrl = ({
  id,
  name,
  url,
}: {
  id: string;
  name?: string;
  url: string;
}): string => {
  if (!id || !/^https?:\/\//i.test(url)) return url;

  const path = `${encodeURIComponent(id)}/${encodeURIComponent(name || id)}`;
  return `${FILE_CACHE_PROTOCOL_SCHEME}://${FILE_CACHE_PROTOCOL_HOST}/${path}?src=${encodeURIComponent(url)}`;
};
