import { afterEach, describe, expect, it, vi } from 'vitest';

const platform = vi.hoisted(() => ({ name: 'Windows' }));
vi.mock('@/utils/platform', () => ({ getPlatform: () => platform.name }));

const { markPlatform } = await import('./platform');

afterEach(() => {
  delete document.documentElement.dataset.platform;
});

describe('markPlatform', () => {
  it('marks Windows so global CSS can hide native scrollbars there', () => {
    platform.name = 'Windows';
    markPlatform();

    expect(document.documentElement.dataset.platform).toBe('windows');
  });

  it('leaves other platforms unmarked', () => {
    platform.name = 'Mac OS';
    markPlatform();

    expect(document.documentElement.dataset.platform).toBeUndefined();
  });
});
