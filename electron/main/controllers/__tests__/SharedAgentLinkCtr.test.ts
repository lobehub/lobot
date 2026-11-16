import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { App } from '@/core/App';

import SharedAgentLinkCtr from '../SharedAgentLinkCtr';

const mockBrowserManager = { broadcastToWindow: vi.fn() };
const mockApp = { browserManager: mockBrowserManager } as unknown as App;

describe('SharedAgentLinkCtr', () => {
  let controller: SharedAgentLinkCtr;

  beforeEach(() => {
    vi.clearAllMocks();
    controller = new SharedAgentLinkCtr(mockApp);
  });

  it('holds the share and tells the app a link arrived', async () => {
    await expect(
      controller.handleOpenShared({ share: ' https://app.lobehub.com/a/helper ' }),
    ).resolves.toBe(true);

    expect(mockBrowserManager.broadcastToWindow).toHaveBeenCalledWith(
      'app',
      'sharedAgentLinkReceived',
      undefined,
    );
    await expect(controller.takePending()).resolves.toBe('https://app.lobehub.com/a/helper');
  });

  it('hands out each link once, so it opens once', async () => {
    await controller.handleOpenShared({ share: 'helper' });
    await controller.takePending();
    await expect(controller.takePending()).resolves.toBeNull();
  });

  it('keeps the newest link when several arrive before the app takes one', async () => {
    await controller.handleOpenShared({ share: 'first' });
    await controller.handleOpenShared({ share: 'second' });
    await expect(controller.takePending()).resolves.toBe('second');
  });

  it.each([{}, { share: '   ' }, { share: 'x'.repeat(513) }])(
    'ignores a link without a usable share (%o)',
    async (params) => {
      await expect(controller.handleOpenShared(params)).resolves.toBe(false);
      expect(mockBrowserManager.broadcastToWindow).not.toHaveBeenCalled();
      await expect(controller.takePending()).resolves.toBeNull();
    },
  );
});
