import type { ChannelListItem } from '@lobot/types';
import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useChannelMenu } from './useChannelMenu';

vi.mock('@lobehub/ui', () => ({ copyToClipboard: vi.fn(), toast: {} }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('@/components/RenameModal', () => ({ openRenameModal: vi.fn() }));
vi.mock('./useChannelArchive', () => ({ useChannelArchive: () => ({}) }));
vi.mock('./useRemoveChannel', () => ({ useRemoveChannel: () => vi.fn() }));
vi.mock('./useDeletePeerChat', () => ({ useDeletePeerChat: () => vi.fn() }));

const channel: ChannelListItem = {
  agentId: null,
  canDelete: true,
  createdAt: new Date(),
  id: 'chn_abcdefghijkl',
  projectId: null,
  sequence: 1,
  status: 'active',
  title: 'Design',
  workspaceId: null,
};

const keys = (item: ChannelListItem) => {
  const { result } = renderHook(useChannelMenu);
  return result.current(item).map((entry) => ('key' in entry ? entry.key : entry.type));
};

describe('useChannelMenu', () => {
  it('manages a group Channel', () => {
    expect(keys(channel)).toEqual([
      'pin',
      'mute',
      'rename',
      'copyId',
      'archive',
      'divider',
      'delete',
    ]);
  });

  // Both people own the conversation: renaming, archiving or trashing it would change it for the
  // other person too.
  it('offers a conversation between two people only what changes it for me', () => {
    expect(keys({ ...channel, peerUserId: 'usr_lijian' })).toEqual([
      'pin',
      'mute',
      'divider',
      'deleteChat',
    ]);
  });
});
