const CACHE = 'lobe-media-v1';
const SW_NAME = 'media-cache-sw.js';

const scriptIsMediaCache = (scriptURL: string | undefined) => !!scriptURL?.includes(SW_NAME);

/**
 * Removes the image service worker. It cached responses under a different address than the
 * `<img>` requested, and a failed or opaque entry then came back as a broken image, so profile
 * photos fell through to the generated avatar. Avatars load from their own URL again.
 */
export const retireBrowserMediaCache = () => {
  if (typeof window === 'undefined') return;

  if (typeof caches !== 'undefined') void caches.delete(CACHE).catch(() => {});

  const workers = navigator.serviceWorker;
  if (!workers?.getRegistrations) return;
  void workers
    .getRegistrations()
    .then((registrations) =>
      Promise.all(
        registrations
          .filter((registration) =>
            [registration.active, registration.waiting, registration.installing].some((worker) =>
              scriptIsMediaCache(worker?.scriptURL),
            ),
          )
          .map((registration) => registration.unregister()),
      ),
    )
    .catch(() => {});
};
