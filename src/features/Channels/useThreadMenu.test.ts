import type { ChannelListItem, ChannelPublicThread } from '@lobot/types';
import { cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { threadPanelMenuItems, useThreadMenu } from './useThreadMenu';

const { copyToClipboard, success, error } = vi.hoisted(() => ({
  copyToClipboard: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
}));
vi.mock('@lobehub/ui', () => ({ copyToClipboard, toast: { error, success } }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('@/hooks/useAppOrigin', () => ({ useAppOrigin: () => 'https://app.lobehub.com' }));
vi.mock('@/business/client/hooks/useActiveWorkspaceSlug', () => ({
  useActiveWorkspaceSlug: () => 'acme',
}));
vi.mock('./useChannelArchive', () => ({
  useChannelArchive: () => ({ setThreadArchived: vi.fn() }),
}));
vi.mock('./useRemoveThread', () => ({ useRemoveThread: () => vi.fn() }));

const channel = {
  canDelete: false,
  id: 'chn_abcdefghijkl',
  projectId: 'prj_1',
  status: 'active',
} as ChannelListItem;
const thread = { id: 'cht_thread1', status: 'active' } as ChannelPublicThread;

const menu = (overrides: Partial<ChannelListItem> = {}) => {
  const { result } = renderHook(() => useThreadMenu());
  return result.current({ ...channel, ...overrides }, thread) as any[];
};
const item = (items: any[], key: string) => items.find((entry) => entry.key === key);

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('useThreadMenu', () => {
  it('lets a member who cannot manage the thread still copy its link and id', async () => {
    const items = menu();
    expect(items.map((entry) => entry.key)).toEqual(['copyThreadLink', 'copyThreadId']);

    await item(items, 'copyThreadLink').onClick();
    expect(copyToClipboard).toHaveBeenCalledWith(
      'https://app.lobehub.com/acme/channels/chn_abcdefghijkl?thread=cht_thread1&view=page',
    );
    expect(success).toHaveBeenCalledWith('copyThreadLinkSuccess');

    await item(items, 'copyThreadId').onClick();
    expect(copyToClipboard).toHaveBeenLastCalledWith('cht_thread1');
    expect(success).toHaveBeenLastCalledWith('copyThreadIdSuccess');
  });

  it('leads the side panel menu with open as page', () => {
    const onClick = vi.fn();
    const openPage = { key: 'openThreadPage', label: 'openThreadPage', onClick };

    expect(threadPanelMenuItems(menu(), openPage).map((entry) => entry.key ?? entry.type)).toEqual([
      'openThreadPage',
      'divider',
      'copyThreadLink',
      'copyThreadId',
    ]);
    expect(threadPanelMenuItems([], openPage).map((entry) => entry.key)).toEqual([
      'openThreadPage',
    ]);
    const actions = menu();
    expect(threadPanelMenuItems(actions, null)).toBe(actions);

    openPage.onClick();
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('puts archive first and delete last for a manager', () => {
    expect(menu({ canDelete: true }).map((entry) => entry.key ?? entry.type)).toEqual([
      'archiveThread',
      'divider',
      'copyThreadLink',
      'copyThreadId',
      'divider',
      'deleteThread',
    ]);
  });

  it('reports a failed copy instead of claiming success', async () => {
    copyToClipboard.mockRejectedValueOnce(new Error('denied'));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    await item(menu(), 'copyThreadId').onClick();
    expect(success).not.toHaveBeenCalled();
    expect(error).toHaveBeenCalledWith('actionFailed');
  });
});
