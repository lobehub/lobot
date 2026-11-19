'use client';

import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { DEFAULT_INBOX_TITLE } from '@lobechat/const';
import { Flexbox } from '@lobehub/ui';
import { agentDisplayName } from '@lobot/types';
import * as stylex from '@stylexjs/stylex';
import isEqual from 'fast-deep-equal';
import { memo, useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import { useActiveWorkspaceSlug } from '@/business/client/hooks/useActiveWorkspaceSlug';
import AsyncError from '@/components/AsyncError';
import { resolveInboxAgentRouteId } from '@/features/AgentRoute/useResolvedAgentRouteId';
import { matchChannel } from '@/features/Channels/paths';
import { useChannelEvents } from '@/features/Channels/useChannelEvents';
import { useChannelsEnabled } from '@/features/Channels/useChannelsEnabled';
import { suppressNextClick } from '@/features/HomeSidebar/Body/sortableRow';
import SkeletonList from '@/features/NavPanel/components/SkeletonList';
import { useActiveLocation } from '@/hooks/useActiveLocation';
import { useFetchAgentList } from '@/hooks/useFetchAgentList';
import { useAgentStore } from '@/store/agent';
import { agentSelectors, builtinAgentSelectors } from '@/store/agent/selectors';
import { channelActions, channelSelectors, useChannelStore } from '@/store/channel';
import { useHomeStore } from '@/store/home';
import { homeAgentListSelectors } from '@/store/home/selectors';
import { useCurrentProjectList, useProjectStore } from '@/store/project';
import { useUserStore } from '@/store/user';
import { userProfileSelectors } from '@/store/user/selectors';

import AgentConversation from './AgentConversation';
import ChannelConversation from './ChannelConversation';
import {
  buildConversationEntries,
  buildConversationSections,
  type Conversation,
  type ConversationEntry,
  groupBySection,
  inboxActivity,
  reuseUnchangedEntries,
  withoutHidden,
} from './conversations';
import GroupConversation from './GroupConversation';
import { showConversation, useHiddenConversations } from './hiddenConversations';
import InboxConversation from './InboxConversation';
import NetworkSearchRow from './NetworkSearchRow';
import { useMessageSearch } from './SearchContext';
import SectionGroup from './SectionGroup';
import { styles } from './style';
import { useUnreadJump } from './unreadJump';

/**
 * `/agent/:id/...`, `/group/:id/...` or `/channels/:id` → the routed conversation id. A direct
 * Channel stands for its Agent, so opening one highlights that Agent's row.
 */
const useActiveRouteId = () => {
  const { pathname } = useActiveLocation();
  const slug = useActiveWorkspaceSlug();
  const channelId = matchChannel(pathname);
  const directAgentId = useChannelStore((s) =>
    channelId
      ? channelSelectors.list(s)?.find((channel) => channel.id === channelId)?.agentId
      : undefined,
  );
  if (channelId) return directAgentId ?? channelId;

  const segments = pathname.split('/').filter(Boolean);
  const [root, id] = slug && segments[0] === slug ? segments.slice(1) : segments;

  return root === 'agent' || root === 'group' ? id : undefined;
};

const ConversationItem = memo<{
  active: boolean;
  conversation: Conversation;
  variant?: 'row' | 'tile';
}>(({ active, conversation, variant }) =>
  conversation.item.type === 'group' ? (
    <GroupConversation active={active} conversation={conversation} variant={variant} />
  ) : (
    <AgentConversation active={active} conversation={conversation} variant={variant} />
  ),
);

ConversationItem.displayName = 'ConversationItem';

/** Keeps the Channel list fresh while Channels are on; it has no row of its own. */
const ChannelSync = memo(() => {
  const { error } = channelActions.useFetchList();
  // The person's own sections; a server without them leaves the list unsectioned.
  channelActions.useFetchSections(true);
  useChannelEvents();

  return error ? (
    <AsyncError error={error} variant="inline" onRetry={() => void channelActions.refreshList()} />
  ) : null;
});

ChannelSync.displayName = 'MessageListChannelSync';

const Body = memo(() => {
  const { t } = useTranslation(['common', 'channel']);
  const { error: agentsError, mutate: retryAgents } = useFetchAgentList();
  const isInit = useHomeStore(homeAgentListSelectors.isAgentListInit);

  const items = useHomeStore(homeAgentListSelectors.allAgents, isEqual);
  const activeRouteId = useActiveRouteId();
  const channelsEnabled = useChannelsEnabled();
  const allChannels = useChannelStore(channelSelectors.list);
  const sections = useChannelStore(channelSelectors.sections);
  useProjectStore((s) => s.useFetchProjectList)(channelsEnabled);
  const projects = useCurrentProjectList();
  const projectMap = useMemo(
    () => new Map(projects.map((project) => [project.id, project] as const)),
    [projects],
  );
  const { query } = useMessageSearch();
  // Group Channels, a project's included as that project's group chat; a direct Channel opens
  // from its Agent's row. An archived one leaves the list unless it is open; search still finds it.
  const directChannels = useMemo(
    () =>
      new Map(
        channelsEnabled
          ? (allChannels ?? [])
              .filter((channel) => channel.agentId && !channel.sharedAgent && !channel.projectId)
              .map((channel) => [channel.agentId!, channel] as const)
          : [],
      ),
    [allChannels, channelsEnabled],
  );
  const channels = useMemo(() => {
    // Another person's shared Agent has no Agent row of mine, so its direct Channel lists like a
    // group; so does a conversation with another person.
    const groups = channelsEnabled
      ? (allChannels ?? []).filter((channel) => !channel.agentId || channel.sharedAgent)
      : [];
    const isHidden = (channel: (typeof groups)[number]) =>
      channel.status === 'archived' && channel.id !== activeRouteId;
    return query.trim() ? groups : groups.filter((channel) => !isHidden(channel));
  }, [activeRouteId, allChannels, channelsEnabled, query]);

  const inboxAgentId = useAgentStore(builtinAgentSelectors.inboxAgentId);
  const inboxUpdatedAt = useAgentStore((s) =>
    inboxAgentId ? s.agentMap[inboxAgentId]?.updatedAt : undefined,
  );
  const inboxTitle = useAgentStore((s) =>
    agentDisplayName(
      agentSelectors.getAgentMetaById(resolveInboxAgentRouteId(inboxAgentId))(s),
      DEFAULT_INBOX_TITLE,
    ),
  );

  const inboxChannel = inboxAgentId ? directChannels.get(inboxAgentId) : undefined;
  const userId = useUserStore(userProfileSelectors.userId);

  // Opening a hidden conversation from elsewhere (contacts, a notification) brings its row back.
  useEffect(() => {
    if (!activeRouteId) return;
    showConversation(activeRouteId);
    if (activeRouteId === inboxAgentId || activeRouteId === resolveInboxAgentRouteId(inboxAgentId))
      showConversation('inbox');
  }, [activeRouteId, inboxAgentId]);
  const hiddenAt = useHiddenConversations();

  // Opening another conversation rebuilds the list; keep each unchanged entry's object so only
  // the rows whose content changed (the two whose highlight moves) re-render.
  const previousEntries = useRef<ConversationEntry[]>([]);
  const entries = useMemo(() => {
    const next = reuseUnchangedEntries(
      previousEntries.current,
      withoutHidden(
        buildConversationEntries(
          buildConversationSections(items, directChannels, {
            activeId: activeRouteId,
            includeIdle: !!query.trim(),
            userId,
          }),
          {
            activeAt: inboxActivity(inboxUpdatedAt, inboxChannel),
            channel: inboxChannel,
            title: inboxTitle,
          },
          query,
          channels,
          (channel) => (channel.projectId ? projectMap.get(channel.projectId)?.name : undefined),
        ),
        hiddenAt,
        query,
      ),
    );
    previousEntries.current = next;
    return next;
  }, [
    items,
    directChannels,
    activeRouteId,
    inboxUpdatedAt,
    inboxTitle,
    inboxChannel,
    query,
    channels,
    projectMap,
    hiddenAt,
    userId,
  ]);

  // Pinned conversations lead the list as a card grid, then the person's own sections, then
  // the rest.
  const groups = useMemo(
    () => groupBySection(entries, channelsEnabled ? sections : undefined),
    [channelsEnabled, entries, sections],
  );

  // A click on an already open Messages badge brings the next unread row into view.
  const listRef = useRef<HTMLDivElement>(null);
  useUnreadJump(listRef, groups);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 4 } }),
    // A press-and-hold picks a section up on touch, so a vertical swipe still scrolls the list.
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const sectionIds = useMemo(() => groups.sections.map(({ section }) => section.id), [groups]);
  const handleSectionDragEnd = ({ active, over }: DragEndEvent) => {
    // The drop lands on the dragged header, whose click would fold it.
    suppressNextClick();
    if (!over || active.id === over.id) return;
    void channelActions
      .reorderSections(
        arrayMove(
          sectionIds,
          sectionIds.indexOf(String(active.id)),
          sectionIds.indexOf(String(over.id)),
        ),
      )
      .catch((error) => console.error('Failed to reorder sections', error));
  };

  const renderEntry = (entry: ConversationEntry, variant?: 'row' | 'tile') =>
    entry.type === 'inbox' ? (
      <InboxConversation
        activeAt={entry.activeAt}
        activeRouteId={activeRouteId}
        channel={entry.channel}
        key={'inbox'}
        variant={variant}
      />
    ) : entry.type === 'channel' ? (
      <ChannelConversation
        active={entry.channel.id === activeRouteId}
        activeAt={entry.activeAt}
        channel={entry.channel}
        key={entry.channel.id}
        variant={variant}
      />
    ) : (
      <ConversationItem
        active={entry.item.id === activeRouteId}
        conversation={entry}
        key={entry.item.id}
        variant={variant}
      />
    );

  // Only the agent rows wait on the agent list: Lobe AI and Channels load on their own, so a slow
  // or failed request must not hide them.
  const agentsLoading = !isInit && items.length === 0;

  return (
    <Flexbox gap={1} paddingBlock={'0 12px'} paddingInline={6} ref={listRef}>
      {groups.pinned.length > 0 && (
        <div aria-label={t('navPanel.pinned')} role="group" {...stylex.props(styles.pinnedGroup)}>
          {groups.pinned.map((entry) => renderEntry(entry, 'tile'))}
        </div>
      )}
      {groups.sections.length > 0 && (
        <DndContext
          collisionDetection={closestCenter}
          sensors={sensors}
          onDragEnd={handleSectionDragEnd}
        >
          <SortableContext items={sectionIds} strategy={verticalListSortingStrategy}>
            {groups.sections.map((group) => (
              <SectionGroup
                group={group}
                key={group.section.id}
                renderEntry={renderEntry}
                searching={!!query.trim()}
              />
            ))}
          </SortableContext>
        </DndContext>
      )}
      {groups.rest.length > 0 && groups.sections.length > 0 && !query.trim() && (
        <div {...stylex.props(styles.restDivider)} />
      )}
      {groups.rest.map(renderEntry)}
      {agentsLoading ? (
        agentsError ? (
          <AsyncError error={agentsError} variant="inline" onRetry={() => void retryAgents()} />
        ) : (
          <SkeletonList paddingBlock={8} />
        )
      ) : (
        entries.length === 0 && (
          <div {...stylex.props(styles.empty)}>
            {query ? t('navPanel.searchResultEmpty') : t('messageList.empty')}
          </div>
        )
      )}
      {channelsEnabled && query.trim() && <NetworkSearchRow query={query.trim()} />}
      {channelsEnabled && <ChannelSync />}
    </Flexbox>
  );
});

Body.displayName = 'MessageListBody';

export default Body;
