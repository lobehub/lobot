import {
  FILE_CACHE_PROTOCOL_SCHEME,
  isDesktop,
  isFileProxyUrl,
  stableFileCacheUrl,
  stableMediaCacheUrl,
} from '@lobechat/const';

/**
 * Address an image or video should load on desktop.
 *
 * The path is the cache key (file id, or the URL with its signature removed). `src` is carried on
 * the same request so a miss can still download: a bare cache address 404s, and an `<img>` that
 * 404s is then treated as a missing avatar. The disk copy is reused for a key it already has, so
 * a new signature does not download the bytes again.
 *
 * The `/f/:id` proxy is left as is: the main process intercepts its image loads and serves them
 * from the same cache by file id. Web keeps the original URL.
 */
export const cachedMediaUrl = (
  url: string | undefined,
  file?: { id?: string; name?: string },
): string | undefined => {
  if (!url || !isDesktop) return url;
  if (url.startsWith(`${FILE_CACHE_PROTOCOL_SCHEME}:`)) return url;
  if (isFileProxyUrl(url)) return url;

  const stable = file?.id
    ? stableFileCacheUrl({ id: file.id, name: file.name })
    : stableMediaCacheUrl(url);
  if (!stable) return url;

  const display = new URL(stable);
  display.searchParams.set('src', url);
  return display.toString();
};
