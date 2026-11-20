'use client';

import { DEFAULT_INBOX_AVATAR, DEFAULT_INBOX_TITLE } from '@lobechat/const';
import type { ChannelListItem } from '@lobot/types';
import { agentDisplayName } from '@lobot/types';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';

import AgentAvatar from '@/components/AgentAvatar';
import { resolveInboxAgentRouteId } from '@/features/AgentRoute/useResolvedAgentRouteId';
import { usePrefetchAgent } from '@/hooks/usePrefetchAgent';
import { useAgentStore } from '@/store/agent';
import { agentSelectors, builtinAgentSelectors } from '@/store/agent/selectors';
import { channelActions } from '@/store/channel';
import { useChatStore } from '@/store/chat';
import { operationSelectors } from '@/store/chat/selectors';
import { useUserStore } from '@/store/user';
import { userProfileSelectors } from '@/store/user/selectors';

import ConversationRow from './ConversationRow';
import { channelPreviewThread, conversationPreview, replyActivity } from './conversations';
import { conversationAvatarSize } from './style';
import { useInboxConversationLink } from './useAgentConversationLink';
import { useDirectChannelRow } from './useDirectChannelRow';

/** The built-in Lobe AI conversation, always first in the list. */
const InboxConversation = memo<{
  activeAt?: Date;
  activeRouteId?: string;
  /** The inbox Agent's direct Channel, when the row opens it. */
  channel?: ChannelListItem;
  /** Large when this is the only pin; compact when several are pinned. */
  tile?: 'solo' | 'pair' | 'compact' | 'dense';
  variant?: 'row' | 'tile';
}>(({ activeAt, activeRouteId, channel, tile, variant }) => {
  const { t } = useTranslation('chat');
  const inboxAgentId = useAgentStore(builtinAgentSelectors.inboxAgentId);
  const routeId = resolveInboxAgentRouteId(inboxAgentId);
  const meta = useAgentStore(agentSelectors.getAgentMetaById(routeId));
  const running = useChatStore(
    inboxAgentId ? operationSelectors.isAgentVisiblyRunning(inboxAgentId) : () => false,
  );
  const prefetchAgent = usePrefetchAgent();
  const warm = () => {
    if (inboxAgentId) prefetchAgent(inboxAgentId);
    if (channel?.id) void channelActions.warmView(channel.id);
  };
  const userId = useUserStore(userProfileSelectors.userId);
  const { onClick, url } = useInboxConversationLink();
  const title = agentDisplayName(meta, DEFAULT_INBOX_TITLE);
  const active = !!activeRouteId && (activeRouteId === routeId || activeRouteId === inboxAgentId);
  const {
    channelActions: directMenu,
    replyState,
    workingCount,
  } = useDirectChannelRow(channel, active);
  const avatarState = replyState ?? (running ? 'working' : undefined);
  const activity = replyActivity(avatarState);

  return (
    <ConversationRow
      active={active}
      activity={activity}
      hideKey={'inbox'}
      previewThread={channelPreviewThread(channel)}
      tile={tile}
      title={title}
      unread={channel?.unreadCount ?? undefined}
      url={url}
      variant={variant}
      avatar={
        <AgentAvatar
          agentId={routeId}
          animated={!!avatarState}
          avatar={meta.avatar || DEFAULT_INBOX_AVATAR}
          name={title}
          size={conversationAvatarSize(variant, tile)}
          state={avatarState}
        />
      }
      onClick={onClick}
      onIntent={warm}
      activeAt={activeAt}
      // Its direct Channel is the only thing this row acts on: pin it, or free an archived one.
      contextMenuItems={channel ? directMenu : undefined}
      activityCount={workingCount}
      // Same preview and time as every other Agent row; its tagline when it has nothing yet.
      preview={conversationPreview(meta.description, channel, userId) ?? t('inbox.desc')}
    />
  );
});

InboxConversation.displayName = 'InboxConversation';

export default InboxConversation;
