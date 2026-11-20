import { beforeEach, describe, expect, it, vi } from 'vitest';

const dev = vi.hoisted(() => vi.fn(() => false));
vi.mock('@/utils/platform', () => ({ dev }));

const { windowsAppUserModelId } = await import('./windowsAppUserModelId');

describe('windowsAppUserModelId', () => {
  beforeEach(() => {
    dev.mockReturnValue(false);
  });

  it('uses the installed app id for a packaged build', () => {
    expect(windowsAppUserModelId()).toBe('com.lobehub.lobot');
    expect(windowsAppUserModelId('com.acme.work')).toBe('com.acme.work');
  });

  it('keeps a dev build off the installed shortcut', () => {
    dev.mockReturnValue(true);

    expect(windowsAppUserModelId()).toBe('com.lobehub.lobot.dev');
    expect(windowsAppUserModelId('com.acme.work')).toBe('com.acme.work.dev');
  });
});
