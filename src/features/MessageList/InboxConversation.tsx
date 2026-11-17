'use client';

import { DEFAULT_INBOX_AVATAR, DEFAULT_INBOX_TITLE } from '@lobechat/const';
import type { ChannelListItem, RecentItem } from '@lobot/types';
import { agentDisplayName } from '@lobot/types';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';

import AgentAvatar from '@/components/AgentAvatar';
import { resolveInboxAgentRouteId } from '@/features/AgentRoute/useResolvedAgentRouteId';
import { usePrefetchAgent } from '@/hooks/usePrefetchAgent';
import { useAgentStore } from '@/store/agent';
import { agentSelectors, builtinAgentSelectors } from '@/store/agent/selectors';
import { useChatStore } from '@/store/chat';
import { operationSelectors } from '@/store/chat/selectors';

import ConversationRow from './ConversationRow';
import { channelPreviewThread, conversationPreview, replyActivity } from './conversations';
import { AVATAR_SIZE } from './style';
import { useInboxConversationLink } from './useAgentConversationLink';
import { useDirectChannelRow } from './useDirectChannelRow';

/** The built-in Lobe AI conversation, always first in the list. */
const InboxConversation = memo<{
  activeAt?: Date;
  activeRouteId?: string;
  /** The inbox Agent's direct Channel, when the row opens it. */
  channel?: ChannelListItem;
  /** Its latest topic, previewed like any other Agent row's while it has no direct Channel. */
  topic?: RecentItem;
}>(({ activeAt, activeRouteId, channel, topic }) => {
  const { t } = useTranslation('chat');
  const inboxAgentId = useAgentStore(builtinAgentSelectors.inboxAgentId);
  const routeId = resolveInboxAgentRouteId(inboxAgentId);
  const meta = useAgentStore(agentSelectors.getAgentMetaById(routeId));
  const running = useChatStore(
    inboxAgentId ? operationSelectors.isAgentVisiblyRunning(inboxAgentId) : () => false,
  );
  const prefetchAgent = usePrefetchAgent();
  const { onClick, url } = useInboxConversationLink();
  const title = agentDisplayName(meta, DEFAULT_INBOX_TITLE);
  const active = !!activeRouteId && (activeRouteId === routeId || activeRouteId === inboxAgentId);
  const { channelActions, replyState, workingCount } = useDirectChannelRow(channel, active);
  const avatarState = replyState ?? (running ? 'working' : undefined);
  const activity = replyActivity(avatarState);

  return (
    <ConversationRow
      active={active}
      activity={activity}
      hideKey={'inbox'}
      previewThread={channelPreviewThread(channel)}
      title={title}
      unread={channel?.unreadCount ?? undefined}
      url={url}
      avatar={
        <AgentAvatar
          agentId={routeId}
          animated={!!avatarState}
          avatar={meta.avatar || DEFAULT_INBOX_AVATAR}
          name={title}
          size={AVATAR_SIZE}
          state={avatarState}
        />
      }
      onClick={onClick}
      onMouseEnter={() => inboxAgentId && prefetchAgent(inboxAgentId)}
      activeAt={activeAt}
      // Its direct Channel is the only thing this row acts on: pin it, or free an archived one.
      contextMenuItems={channel ? channelActions : undefined}
      activityCount={workingCount}
      // Same preview and time as every other Agent row; its tagline when it has nothing yet.
      preview={conversationPreview(meta.description, topic, channel) ?? t('inbox.desc')}
    />
  );
});

InboxConversation.displayName = 'InboxConversation';

export default InboxConversation;
