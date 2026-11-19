'use client';

import { AGENT_CHAT_URL } from '@lobechat/const';
import { useWatchBroadcast } from '@lobechat/electron-client-ipc';
import { useCallback } from 'react';

import { useCreateMenuItems } from '@/features/HomeSidebar/hooks/useCreateMenuItems';
import { useCreateActions } from '@/features/MessageList/useCreateActions';
import { useWorkspaceAwareNavigate } from '@/features/Workspace/useWorkspaceAwareNavigate';
import { useAgentStore } from '@/store/agent';
import { builtinAgentSelectors } from '@/store/agent/selectors';
import { useChatStore } from '@/store/chat';

import { openCurrentWorkspaceInNewWindow } from './openCurrentWorkspaceInNewWindow';

/**
 * Bridge component for handling File menu actions from Electron main process
 * Listens to broadcast events for creating new topics, agents, agent groups, pages and windows
 */
const DesktopFileMenuBridge = () => {
  const { createPage } = useCreateMenuItems();
  // The same actions as the Messages "+" menu.
  const { addFriend, createAgent, createGroupChat } = useCreateActions();
  const navigate = useWorkspaceAwareNavigate();
  const inboxAgentId = useAgentStore(builtinAgentSelectors.inboxAgentId);
  const activeAgentId = useAgentStore((s) => s.activeAgentId);

  // Handle create new topic from File menu
  // If currently in an agent page, clear the active topic via the store —
  // navigating to the same path won't clear `activeTopicId` because
  // ChatHydration's URL→store updater skips `undefined` values.
  // If not in an agent page, navigate to inbox agent.
  const handleCreateNewTopic = useCallback(() => {
    if (activeAgentId) {
      useChatStore.getState().switchTopic(null);
      return;
    }
    navigate(AGENT_CHAT_URL(inboxAgentId, false));
  }, [activeAgentId, inboxAgentId, navigate]);

  // Handle create new page from File menu
  const handleCreateNewPage = useCallback(async () => {
    await createPage();
  }, [createPage]);

  useWatchBroadcast('createNewTopic', handleCreateNewTopic);
  useWatchBroadcast('createNewAgent', createAgent);
  useWatchBroadcast('createNewAgentGroup', createGroupChat);
  useWatchBroadcast('openAddFriend', addFriend);
  useWatchBroadcast('createNewPage', handleCreateNewPage);
  useWatchBroadcast('openNewWindow', openCurrentWorkspaceInNewWindow);

  return null;
};

export default DesktopFileMenuBridge;
