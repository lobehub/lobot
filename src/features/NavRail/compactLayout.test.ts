import { describe, expect, it } from 'vitest';

import { compactBackTarget, isCompactListRoute } from './compactLayout';

describe('isCompactListRoute', () => {
  it('shows the list on each tab root', () => {
    for (const pathname of ['/', '/agents', '/settings', '/channels', '/?thread=t1']) {
      expect(isCompactListRoute(pathname, null)).toBe(true);
    }
  });

  it('shows the content on any page inside a tab', () => {
    for (const pathname of [
      '/channels/ch_1',
      '/channels/ch_1/settings',
      '/agents/agt_1',
      '/agents/people/u_1',
      '/agents/shared/abc',
      '/settings/profile',
      '/settings/profile/username',
    ]) {
      expect(isCompactListRoute(pathname, null)).toBe(false);
    }
  });

  it('reads workspace-scoped paths below the slug', () => {
    expect(isCompactListRoute('/acme', 'acme')).toBe(true);
    expect(isCompactListRoute('/acme/agents', 'acme')).toBe(true);
    expect(isCompactListRoute('/acme/channels/ch_1', 'acme')).toBe(false);
  });
});

describe('compactBackTarget', () => {
  it('leads a content page back to the list it was opened from', () => {
    expect(compactBackTarget('/channels/ch_1', null)).toBe('/');
    expect(compactBackTarget('/channels/ch_1?thread=t1', null)).toBe('/');
    expect(compactBackTarget('/agents/agt_1', null)).toBe('/agents');
    expect(compactBackTarget('/agents/people/u_1', null)).toBe('/agents');
    expect(compactBackTarget('/agents/shared/abc', null)).toBe('/agents');
    expect(compactBackTarget('/settings/profile', null)).toBe('/settings');
    expect(compactBackTarget('/acme/channels/ch_1', 'acme')).toBe('/');
  });

  it('adds none to list pages or pages with their own back button', () => {
    for (const pathname of [
      '/',
      '/agents',
      '/settings',
      '/channels/ch_1/settings',
      '/settings/profile/username',
    ]) {
      expect(compactBackTarget(pathname, null)).toBeNull();
    }
  });
});
