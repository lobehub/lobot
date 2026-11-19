import { CHANNEL_URL } from '@lobechat/const';
import { useCallback } from 'react';

import { openAddContactModal } from '@/features/AddContactModal';
import { openCreateChannel } from '@/features/Channels/CreateChannel';
import { useCreateMenuItems } from '@/features/HomeSidebar/hooks/useCreateMenuItems';
import { useWorkspaceAwareNavigate } from '@/features/Workspace/useWorkspaceAwareNavigate';

/**
 * The three things a new conversation starts from: an Agent, a group chat and a friend. The
 * Messages "+" menu and the desktop app menu both call these, so the two entries stay alike.
 */
export const useCreateActions = () => {
  const { isLoading, openCreateAgentModal } = useCreateMenuItems();
  const navigate = useWorkspaceAwareNavigate();

  const createAgent = useCallback(() => openCreateAgentModal(), [openCreateAgentModal]);

  // A group chat is a Channel.
  const createGroupChat = useCallback(() => {
    openCreateChannel((id) => navigate(CHANNEL_URL(id)));
  }, [navigate]);

  const addFriend = useCallback(() => openAddContactModal(), []);

  return { addFriend, createAgent, createGroupChat, isLoading };
};
