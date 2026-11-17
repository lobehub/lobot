import type { ChannelListItem } from '@lobot/types';
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useHiddenConversationStore } from '@/features/MessageList/hiddenConversations';
import { cacheScope } from '@/libs/replica';
import { channelActions } from '@/store/channel';

import { useClearedChannelStore } from './clearedChannels';
import { useDeletePeerChat } from './useDeletePeerChat';

const { confirm, navigate, success, location } = vi.hoisted(() => ({
  confirm: vi.fn(),
  navigate: vi.fn(),
  success: vi.fn(),
  location: { pathname: '/' },
}));
vi.mock('@lobehub/ui', () => ({ confirmModal: confirm, toast: { error: vi.fn(), success } }));
vi.mock('@/features/Workspace/useWorkspaceAwareNavigate', () => ({
  useWorkspaceAwareNavigate: () => navigate,
}));
vi.mock('@/hooks/useActiveLocation', () => ({ useActiveLocation: () => ({ ...location }) }));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, args?: { name?: string }) => (args?.name ? `${key}:${args.name}` : key),
  }),
}));

// LiJian opened the conversation, so its stored title names Arvin; Arvin is the viewer here.
const channel: ChannelListItem = {
  agentId: null,
  canDelete: true,
  createdAt: new Date(),
  id: 'chn_abcdefghijkl',
  memberAvatars: [
    { actorType: 'user', avatar: null, backgroundColor: null, id: 'usr_lijian', name: 'LiJian' },
  ],
  peerUserId: 'usr_lijian',
  projectId: null,
  sequence: 42,
  status: 'active',
  title: 'Arvin Xu',
  workspaceId: null,
};

describe('Deleting a conversation between two people', () => {
  beforeEach(() => {
    vi.spyOn(cacheScope, 'get').mockReturnValue('personal');
    vi.spyOn(channelActions, 'markRead').mockResolvedValue(undefined as never);
    vi.spyOn(channelActions, 'remove');
    useClearedChannelStore.setState({ clearedThrough: {} });
    useHiddenConversationStore.setState({ hiddenAt: {} });
    location.pathname = '/';
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  const confirmDelete = (item = channel) => {
    const { result } = renderHook(useDeletePeerChat);
    act(() => {
      result.current(item);
    });
    return confirm.mock.calls[0]?.[0] as
      { content: string; okText: string; onOk: () => void } | undefined;
  };

  it('names the other person, not the stored title', () => {
    const modal = confirmDelete();

    expect(modal?.content).toBe('deleteChatConfirm:LiJian');
    expect(modal?.okText).toBe('deleteChat');
  });

  it('clears and hides it on this device only, never trashing the shared Channel', () => {
    const modal = confirmDelete()!;
    act(() => modal.onOk());

    expect(useClearedChannelStore.getState().clearedThrough).toEqual({
      'personal:chn_abcdefghijkl': 42,
    });
    expect(Object.keys(useHiddenConversationStore.getState().hiddenAt)).toEqual([
      'personal:chn_abcdefghijkl',
    ]);
    expect(channelActions.markRead).toHaveBeenCalledWith('chn_abcdefghijkl', 42);
    expect(channelActions.remove).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
    expect(success).toHaveBeenCalledWith('deleteChatSuccess');
  });

  it('leaves the conversation when it is open', () => {
    location.pathname = '/channels/chn_abcdefghijkl';

    const modal = confirmDelete()!;
    act(() => modal.onOk());

    expect(navigate).toHaveBeenCalledWith('/', { replace: true });
  });

  it('does nothing for a group Channel', () => {
    expect(confirmDelete({ ...channel, peerUserId: null })).toBeUndefined();
    expect(confirm).not.toHaveBeenCalled();
  });
});
