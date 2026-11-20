/**
 * @vitest-environment happy-dom
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

import { retireBrowserMediaCache } from './registerBrowserMediaCache';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('retireBrowserMediaCache', () => {
  it('unregisters the image worker and drops its cache', async () => {
    const unregister = vi.fn().mockResolvedValue(true);
    const getRegistrations = vi.fn().mockResolvedValue([
      { active: { scriptURL: 'https://app.lobehub.com/media-cache-sw.js' }, unregister },
      { active: { scriptURL: 'https://app.lobehub.com/other.js' }, unregister: vi.fn() },
    ]);
    const deleteCache = vi.fn().mockResolvedValue(true);
    vi.stubGlobal('navigator', { serviceWorker: { getRegistrations } });
    vi.stubGlobal('caches', { delete: deleteCache });

    retireBrowserMediaCache();
    await vi.waitFor(() => expect(unregister).toHaveBeenCalledOnce());

    expect(deleteCache).toHaveBeenCalledWith('lobe-media-v1');
    expect(getRegistrations).toHaveBeenCalledOnce();
  });

  it('does nothing when the page has no service worker', () => {
    vi.stubGlobal('navigator', {});
    expect(() => retireBrowserMediaCache()).not.toThrow();
  });
});
