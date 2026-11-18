import { describe, expect, it } from 'vitest';

import { desktopRoutes as webDesktopRoutes } from '@/spa/router/desktopRouter.config';
import { desktopRoutes as electronDesktopRoutes } from '@/spa/router/desktopRouter.config.desktop';

import { isMainLayoutLocation } from './routeScope';

const variants: Array<[string, typeof webDesktopRoutes]> = [
  ['Web', webDesktopRoutes],
  ['Electron', electronDesktopRoutes],
];

// Paths that render the nav panel + rounded container the shell imitates.
const MAIN_LAYOUT_PATHS = ['/', '/agents/agent-1', '/channels/channel-1', '/settings/appearance'];

describe('isMainLayoutLocation', () => {
  it.each(variants)('%s recognises main-layout urls', (_, routes) => {
    for (const pathname of MAIN_LAYOUT_PATHS) {
      expect(isMainLayoutLocation(routes, pathname), `${pathname} is main layout`).toBe(true);
    }
  });

  // The shell would otherwise promise chrome these pages never render — the
  // exact "logo → app-shell skeleton → logo → page" sequence this guards.
  it.each([
    ['Web', webDesktopRoutes, ['/onboarding', '/verify-im']],
    ['Electron', electronDesktopRoutes, ['/desktop-onboarding']],
  ])('%s excludes standalone routes outside the main layout', (_, routes, paths) => {
    for (const pathname of paths as string[]) {
      expect(isMainLayoutLocation(routes as never, pathname), `${pathname} is standalone`).toBe(
        false,
      );
    }
  });

  it('honours the debug-proxy basename', () => {
    const base = '/_dangerous_local_dev_proxy';

    expect(isMainLayoutLocation(webDesktopRoutes, `${base}/agents/agent-1`, base)).toBe(true);
    expect(isMainLayoutLocation(webDesktopRoutes, `${base}/onboarding`, base)).toBe(false);
  });

  // The Electron main area ends in a `*` stub (the tab routers render the page),
  // so an unrecognised path still lands inside the main layout there.
  it('treats an unrecognised path as inside the Electron main layout', () => {
    expect(isMainLayoutLocation(electronDesktopRoutes, '/_nonexistent_top_level')).toBe(true);
  });
});
