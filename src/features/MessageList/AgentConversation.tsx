'use client';

import { agentDisplayName } from '@lobot/types';
import { memo, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { useActiveWorkspaceId } from '@/business/client/hooks/useActiveWorkspaceId';
import AgentAvatar from '@/components/AgentAvatar';
import { useAgentDropdownMenu } from '@/features/HomeSidebar/Body/Agent/List/AgentItem/useDropdownMenu';
import { usePreservedAgentUrl } from '@/features/HomeSidebar/Body/Agent/List/usePreservedAgentUrl';
import { useAgentModal } from '@/features/HomeSidebar/Body/Agent/ModalProvider';
import { usePrefetchAgent } from '@/hooks/usePrefetchAgent';
import { useChatStore } from '@/store/chat';
import { operationSelectors } from '@/store/chat/selectors';

import ConversationRow from './ConversationRow';
import { type Conversation, replyActivity } from './conversations';
import { conversationAvatarSize } from './style';
import { useAgentConversationLink } from './useAgentConversationLink';
import { useDirectChannelRow } from './useDirectChannelRow';

/** Agent-list actions the Messages list leaves out. */
const AGENT_ONLY_KEYS = new Set(['duplicate', 'moveGroup', 'pin']);

interface AgentConversationProps {
  active: boolean;
  conversation: Conversation;
  /** Large when this is the only pin; compact when several are pinned. */
  tile?: 'solo' | 'pair' | 'compact' | 'dense';
  variant?: 'row' | 'tile';
}

const AgentConversation = memo<AgentConversationProps>(
  ({ active, conversation, tile, variant }) => {
    const { item, preview, previewThread, activeAt } = conversation;
    const { id, avatar, backgroundColor, pinned, slug, userId, visibility } = item;
    const { t } = useTranslation('chat');
    const { openCreateGroupModal } = useAgentModal();
    const inWorkspace = !!useActiveWorkspaceId();
    const prefetchAgent = usePrefetchAgent();
    const chatRunning = useChatStore(operationSelectors.isAgentVisiblyRunning(id));
    const agentUrl = usePreservedAgentUrl(id);
    const { onClick, url } = useAgentConversationLink(id, agentUrl);
    const { channelActions, replyState, workingCount } = useDirectChannelRow(
      conversation.channel,
      active,
    );
    const avatarState = replyState ?? (chatRunning ? 'working' : undefined);
    // Only the direct Channel's own reply shows on the preview: a run in one of the Agent's other topics
    // only animates the avatar. A blocked reply keeps the preview; its avatar shows it waiting.
    const activity = replyActivity(replyState);
    const title = agentDisplayName(item, t('untitledAgent'));
    const avatarSrc = typeof avatar === 'string' ? avatar : undefined;

    const handleOpenCreateGroupModal = useCallback(
      () => openCreateGroupModal(id, visibility),
      [id, openCreateGroupModal, visibility],
    );

    const contextMenuItems = useAgentDropdownMenu({
      avatar: avatarSrc,
      backgroundColor: backgroundColor || undefined,
      group: undefined,
      id,
      name: item.name,
      openCreateGroupModal: handleOpenCreateGroupModal,
      pinned: pinned ?? false,
      // The Messages list ignores the sidebar visibility preference.
      sidebarVisibilityEnabled: false,
      slug,
      title,
      userId,
      visibility,
    });

    const menuItems = useMemo(
      () => () => {
        // The Agent's own pin orders the workspace's Agent list for everyone; this list pins the
        // person's own conversation, through its direct Channel. Its sidebar category is the same
        // story — the conversation's own section replaces it — and duplicating belongs to the Agent
        // list, not a chat.
        //
        // In a workspace the row is only a chat: opening, copying, renaming, permissions,
        // visibility and deletion belong to the Agent's own page, so its menu stays out.
        const items = channelActions();
        if (inWorkspace) return items;
        const agentItems = contextMenuItems().filter(
          (entry) => !(entry && 'key' in entry && AGENT_ONLY_KEYS.has(String(entry.key))),
        );
        if (items.length === 0) return agentItems;
        return [...items, { type: 'divider' as const }, ...agentItems];
      },
      [channelActions, contextMenuItems, inWorkspace],
    );

    return (
      <ConversationRow
        active={active}
        activeAt={activeAt}
        activity={activity}
        activityCount={workingCount}
        contextMenuItems={menuItems}
        hideKey={id}
        preview={preview}
        previewThread={previewThread}
        tile={tile}
        title={title}
        unread={conversation.unread ?? item.unreadCount}
        url={url}
        variant={variant}
        avatar={
          // Same avatar the agent has everywhere else, including its direct Channel: its own
          // image or emoji, else the character generated from its id.
          <AgentAvatar
            agentId={id}
            animated={!!avatarState}
            avatar={avatarSrc}
            background={backgroundColor || undefined}
            name={title}
            size={conversationAvatarSize(variant, tile)}
            state={avatarState}
          />
        }
        onClick={onClick}
        onMouseEnter={() => prefetchAgent(id)}
      />
    );
  },
);

AgentConversation.displayName = 'AgentConversation';

export default AgentConversation;
