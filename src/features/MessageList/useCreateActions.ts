import { CHANNEL_URL } from '@lobechat/const';
import { useCallback } from 'react';

import { openAddContactModal } from '@/features/AddContactModal';
import { openCreateChannel } from '@/features/Channels/CreateChannel';
import { useChannelsEnabled } from '@/features/Channels/useChannelsEnabled';
import { useCreateMenuItems } from '@/features/HomeSidebar/hooks/useCreateMenuItems';
import { useWorkspaceAwareNavigate } from '@/features/Workspace/useWorkspaceAwareNavigate';

/**
 * The three things a new conversation starts from: an Agent, a group chat and a friend. The
 * Messages "+" menu and the desktop app menu both call these, so the two entries stay alike.
 */
export const useCreateActions = () => {
  const { createEmptyGroup, isLoading, openCreateAgentModal, openCreateModal } =
    useCreateMenuItems();
  const channelsEnabled = useChannelsEnabled();
  const navigate = useWorkspaceAwareNavigate();

  const createAgent = useCallback(() => openCreateAgentModal(), [openCreateAgentModal]);

  // With Channels on, a group chat is a Channel; otherwise the legacy Agent group.
  const createGroupChat = useCallback(async () => {
    if (channelsEnabled) {
      openCreateChannel((id) => navigate(CHANNEL_URL(id)));
      return;
    }
    if (openCreateModal) openCreateModal('group', {});
    else await createEmptyGroup();
  }, [channelsEnabled, createEmptyGroup, navigate, openCreateModal]);

  const addFriend = useCallback(() => openAddContactModal(), []);

  return { addFriend, channelsEnabled, createAgent, createGroupChat, isLoading };
};
