import { Children, type ReactElement, type ReactNode } from 'react';
import { describe, expect, it } from 'vitest';

import TabLocationReporter from '@/features/Electron/TabHost/TabLocationReporter';

import { createMainAreaChildren } from './desktopRouter.config';
import { createTabRouter } from './tabRouter';

const matchedPaths = (router: ReturnType<typeof createTabRouter>) =>
  router.state.matches.map((match) => match.route.path);

describe('createTabRouter', () => {
  it('matches the contact route for /agents/abc', () => {
    const router = createTabRouter('/agents/abc');
    const paths = matchedPaths(router);

    expect(router.state.location.pathname).toBe('/agents/abc');
    expect(paths).toContain('agents');
    expect(paths).toContain(':id');
  });

  it('matches a nested channel route for /channels/abc/settings', () => {
    const paths = matchedPaths(createTabRouter('/channels/abc/settings'));

    expect(paths).toContain('channels');
    expect(paths).toContain(':channelId/settings');
  });

  it('still reports the location from the root error element, which replaces the layout', () => {
    const errorElement = createTabRouter('/').routes[0].errorElement as ReactElement;
    const children = Children.toArray(
      (errorElement.props as { children?: ReactNode }).children,
    ) as ReactElement[];

    expect(children.map((child) => child.type)).toContain(TabLocationReporter);
  });

  it('creates independent instances for different URLs', () => {
    const first = createTabRouter('/agents/abc');
    const second = createTabRouter('/channels/xyz');

    expect(first.state.location.pathname).toBe('/agents/abc');
    expect(second.state.location.pathname).toBe('/channels/xyz');
    expect(first.state.location.pathname).not.toBe(second.state.location.pathname);
    expect(matchedPaths(first)).toContain('agents');
    expect(matchedPaths(second)).toContain('channels');
  });
});

describe('createMainAreaChildren', () => {
  it('returns a fresh array instance of the same length on each call', () => {
    const first = createMainAreaChildren();
    const second = createMainAreaChildren();

    expect(first).not.toBe(second);
    expect(first).toHaveLength(second.length);
  });
});
