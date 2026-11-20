'use client';

import {
  DndContext,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useDndContext,
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
import { Flexbox, toast } from '@lobehub/ui';
import { agentDisplayName } from '@lobot/types';
import * as stylex from '@stylexjs/stylex';
import isEqual from 'fast-deep-equal';
import { memo, type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useActiveWorkspaceId } from '@/business/client/hooks/useActiveWorkspaceId';
import { useActiveWorkspaceSlug } from '@/business/client/hooks/useActiveWorkspaceSlug';
import AsyncError from '@/components/AsyncError';
import { resolveInboxAgentRouteId } from '@/features/AgentRoute/useResolvedAgentRouteId';
import { matchChannel } from '@/features/Channels/paths';
import { useChannelEvents } from '@/features/Channels/useChannelEvents';
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
import { userGeneralSettingsSelectors, userProfileSelectors } from '@/store/user/selectors';

import AgentConversation from './AgentConversation';
import ChannelConversation from './ChannelConversation';
import { ConversationDrag, ConversationPinDrop, ConversationRestDrop } from './ConversationDrag';
import {
  canApplyConversationDrop,
  conversationCollision,
  conversationDropActions,
  conversationDropTarget,
  filedSectionId,
  isConversationDragSource,
} from './conversationDrop';
import {
  buildConversationEntries,
  buildConversationSections,
  type Conversation,
  type ConversationEntry,
  conversationKey,
  groupBySection,
  inboxActivity,
  isPinned,
  reuseUnchangedEntries,
  type SectionGroup as SectionGroupData,
  UNGROUPED_SECTION_ID,
  ungroupedSectionData,
  withoutHidden,
  withUngroupedSection,
} from './conversations';
import GroupConversation from './GroupConversation';
import { showConversation, useHiddenConversations } from './hiddenConversations';
import { useHeldWorkspaceList, workspaceListWasSectioned } from './holdWorkspaceList';
import InboxConversation from './InboxConversation';
import NetworkSearchRow from './NetworkSearchRow';
import { useMessageSearch } from './SearchContext';
import SectionGroup from './SectionGroup';
import { pinnedAsRows, pinnedTile, styles } from './style';
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
  tile?: 'solo' | 'pair' | 'compact' | 'dense';
  variant?: 'row' | 'tile';
}>(({ active, conversation, tile, variant }) =>
  conversation.item.type === 'group' ? (
    <GroupConversation active={active} conversation={conversation} tile={tile} variant={variant} />
  ) : (
    <AgentConversation active={active} conversation={conversation} tile={tile} variant={variant} />
  ),
);

ConversationItem.displayName = 'ConversationItem';

/** Keeps the Channel list fresh; it has no row of its own. */
const ChannelSync = memo<{ error?: unknown }>(({ error }) => {
  useChannelEvents();

  return error ? (
    <AsyncError error={error} variant="inline" onRetry={() => void channelActions.refreshList()} />
  ) : null;
});

ChannelSync.displayName = 'MessageListChannelSync';

/**
 * Ungrouped when it has chats, and an empty one while a conversation is dragged onto it. With no
 * saved sections the rest of the list is that landing spot instead.
 */
const UngroupedDragLanding = memo<{
  group?: SectionGroupData;
  onToggle: () => void;
  realSectionCount: number;
  renderEntry: (entry: ConversationEntry) => ReactNode;
  searching: boolean;
}>(({ group, onToggle, realSectionCount, renderEntry, searching }) => {
  const { active } = useDndContext();
  const source = isConversationDragSource(active?.data.current) ? active.data.current : undefined;
  if (group)
    return (
      <SectionGroup
        group={group}
        renderEntry={renderEntry}
        searching={searching}
        onToggle={onToggle}
      />
    );
  if (
    searching ||
    realSectionCount === 0 ||
    !source ||
    conversationDropActions(source, { collapsed: false, sectionId: null, type: 'section' })
      .length === 0
  )
    return null;

  return (
    <SectionGroup
      group={{ entries: [], section: ungroupedSectionData(false) }}
      renderEntry={renderEntry}
      searching={false}
      onToggle={onToggle}
    />
  );
});

UngroupedDragLanding.displayName = 'MessageListUngroupedDragLanding';

const Body = memo(() => {
  const { t } = useTranslation(['common', 'channel']);
  const workspaceId = useActiveWorkspaceId();
  // Ungrouped is drawn by the list, so its fold stays here and starts open in each workspace.
  const [ungroupedCollapsed, setUngroupedCollapsed] = useState(false);
  const [ungroupedWorkspace, setUngroupedWorkspace] = useState(workspaceId);
  if (workspaceId !== ungroupedWorkspace) {
    setUngroupedWorkspace(workspaceId);
    setUngroupedCollapsed(false);
  }
  const { error: agentsError, mutate: retryAgents } = useFetchAgentList();
  const isInit = useHomeStore(homeAgentListSelectors.isAgentListInit);

  const items = useHomeStore(homeAgentListSelectors.allAgents, isEqual);
  const activeRouteId = useActiveRouteId();
  const channelSync = channelActions.useFetchList();
  // The person's own sections; a server without them leaves the list unsectioned.
  channelActions.useFetchSections(true);
  const allChannels = useChannelStore(channelSelectors.list);
  const sections = useChannelStore(channelSelectors.sections);
  useProjectStore((s) => s.useFetchProjectList)(true);
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
        (allChannels ?? [])
          .filter((channel) => channel.agentId && !channel.sharedAgent && !channel.projectId)
          .map((channel) => [channel.agentId!, channel] as const),
      ),
    [allChannels],
  );
  const channels = useMemo(() => {
    // Another person's shared Agent has no Agent row of mine, so its direct Channel lists like a
    // group; so does a conversation with another person.
    const groups = (allChannels ?? []).filter((channel) => !channel.agentId || channel.sharedAgent);
    const isHidden = (channel: (typeof groups)[number]) =>
      channel.status === 'archived' && channel.id !== activeRouteId;
    return query.trim() ? groups : groups.filter((channel) => !isHidden(channel));
  }, [activeRouteId, allChannels, query]);

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
  const inboxDefaultPinned = !!allChannels && !inboxChannel;
  const userId = useUserStore(userProfileSelectors.userId);
  const pinnedLayout = useUserStore(userGeneralSettingsSelectors.pinnedConversationLayout);

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
            // Lobe AI starts pinned: until the person has opened its Channel, there is no pin to
            // read, so a loaded list without one shows it pinned.
            defaultPinned: inboxDefaultPinned,
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
    inboxDefaultPinned,
    query,
    channels,
    projectMap,
    hiddenAt,
    userId,
  ]);

  // Pinned conversations lead the list, then the person's own sections. Chats outside every
  // section gather under Ungrouped once a section exists; otherwise they stay in the rest.
  const liveGroups = useMemo(
    () => withUngroupedSection(groupBySection(entries, sections), ungroupedCollapsed),
    [entries, sections, ungroupedCollapsed],
  );
  // The caches clear before the saved rows are copied back, and a workspace that
  // was opened before still reports itself hydrated. Paint its last list until
  // the rows are actually in memory again, so the pinned tiles do not collapse.
  const liveSectioned = liveGroups.sections.some(
    (group) => group.section.id !== UNGROUPED_SECTION_ID,
  );
  const rowsReady = isInit && allChannels !== undefined;
  const listReady =
    rowsReady && (sections !== undefined || !workspaceListWasSectioned(workspaceId));
  const groups = useHeldWorkspaceList(workspaceId, listReady, liveGroups, liveSectioned);
  const holdingList = !listReady && groups !== liveGroups;

  // A click on an already open Messages badge brings the next unread row into view.
  const listRef = useRef<HTMLDivElement>(null);
  const openSection = (id: string) => {
    if (id !== UNGROUPED_SECTION_ID) return false;
    setUngroupedCollapsed(false);
    return true;
  };
  useUnreadJump(listRef, groups, openSection);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 4 } }),
    // A press-and-hold picks a section up on touch, so a vertical swipe still scrolls the list.
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const realSections = groups.sections.filter((group) => group.section.id !== UNGROUPED_SECTION_ID);
  const ungroupedSection = groups.sections.find(
    (group) => group.section.id === UNGROUPED_SECTION_ID,
  );
  const sectionIds = useMemo(
    () =>
      groups.sections.flatMap(({ section }) =>
        section.id === UNGROUPED_SECTION_ID ? [] : [section.id],
      ),
    [groups],
  );
  const [dragChannelId, setDragChannelId] = useState<string | null>(null);
  const handleDragStart = ({ active }: DragStartEvent) => {
    const source = isConversationDragSource(active.data.current) ? active.data.current : undefined;
    setDragChannelId(source?.channelId ?? null);
  };
  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    // The drop lands on the dragged row or header, whose click would open or fold it.
    suppressNextClick();
    setDragChannelId(null);
    // Rows still on screen from the previous workspace are not this list.
    if (!canApplyConversationDrop(listReady, groups === liveGroups)) return;
    const source = isConversationDragSource(active.data.current) ? active.data.current : undefined;
    if (source) {
      const target = conversationDropTarget(over?.data.current);
      if (!target) return;
      const actions = conversationDropActions(source, target);
      if (actions.length === 0) return;
      const fail = (error: unknown) => {
        console.error('Failed to move conversation', error);
        toast.error(t('actionFailed', { ns: 'channel' }));
      };
      void Promise.all(
        actions.map((action) => {
          if (action.type === 'pin')
            return channelActions.setPinned(action.channelId, action.pinned);
          if (action.type === 'move')
            return channelActions.moveToSection(action.channelId, action.sectionId);
          if (action.type === 'expand')
            return channelActions.setSectionCollapsed(action.sectionId, false);
          setUngroupedCollapsed(false);
          return undefined;
        }),
      ).catch(fail);
      return;
    }
    if (!over || active.id === over.id) return;
    const from = sectionIds.indexOf(String(active.id));
    const to = sectionIds.indexOf(String(over.id));
    if (from < 0 || to < 0) return;
    void channelActions
      .reorderSections(arrayMove(sectionIds, from, to))
      .catch((error) => console.error('Failed to reorder sections', error));
  };

  const savedSections = realSections.map((group) => group.section);
  const renderConversation = (
    entry: ConversationEntry,
    variant?: 'row' | 'tile',
    tile?: 'solo' | 'pair' | 'compact' | 'dense',
  ) =>
    entry.type === 'inbox' ? (
      <InboxConversation
        activeAt={entry.activeAt}
        activeRouteId={activeRouteId}
        channel={entry.channel}
        tile={tile}
        variant={variant}
      />
    ) : entry.type === 'channel' ? (
      <ChannelConversation
        active={entry.channel.id === activeRouteId}
        activeAt={entry.activeAt}
        channel={entry.channel}
        tile={tile}
        variant={variant}
      />
    ) : (
      <ConversationItem
        active={entry.item.id === activeRouteId}
        conversation={entry}
        tile={tile}
        variant={variant}
      />
    );
  const renderEntry = (
    entry: ConversationEntry,
    variant?: 'row' | 'tile',
    tile?: 'solo' | 'pair' | 'compact' | 'dense',
  ) => (
    <ConversationDrag
      channelId={entry.channel?.id}
      disabled={!!query.trim()}
      dragKey={conversationKey(entry)}
      key={conversationKey(entry)}
      pinned={isPinned(entry)}
      sectionId={filedSectionId(entry.channel?.sectionId, savedSections)}
    >
      {renderConversation(entry, variant, tile)}
    </ConversationDrag>
  );
  const draggedEntry = dragChannelId
    ? [...groups.pinned, ...groups.sections.flatMap((group) => group.entries), ...groups.rest].find(
        (entry) => entry.channel?.id === dragChannelId,
      )
    : undefined;

  // Only the agent rows wait on the agent list: Lobe AI and Channels load on their own, so a slow
  // or failed request must not hide them.
  const agentsLoading = !holdingList && !isInit && items.length === 0;
  const pinnedRows = pinnedAsRows(pinnedLayout, groups.pinned.length);

  const foldUngrouped = () => setUngroupedCollapsed((collapsed) => !collapsed);
  const tile = pinnedRows ? undefined : pinnedTile(groups.pinned.length);

  return (
    <Flexbox gap={4} paddingBlock={'0 12px'} paddingInline={6} ref={listRef}>
      <DndContext
        collisionDetection={conversationCollision}
        sensors={sensors}
        onDragCancel={() => setDragChannelId(null)}
        onDragEnd={handleDragEnd}
        onDragStart={handleDragStart}
      >
        <ConversationPinDrop
          count={groups.pinned.length}
          label={t('navPanel.pinned')}
          rows={pinnedRows}
        >
          {groups.pinned.map((entry) => renderEntry(entry, pinnedRows ? undefined : 'tile', tile))}
        </ConversationPinDrop>
        {realSections.length > 0 && (
          <SortableContext items={sectionIds} strategy={verticalListSortingStrategy}>
            {realSections.map((group) => (
              <SectionGroup
                group={group}
                key={group.section.id}
                renderEntry={renderEntry}
                searching={!!query.trim()}
              />
            ))}
          </SortableContext>
        )}
        <UngroupedDragLanding
          group={ungroupedSection}
          realSectionCount={realSections.length}
          renderEntry={renderEntry}
          searching={!!query.trim()}
          onToggle={foldUngrouped}
        />
        {realSections.length === 0 && (
          <ConversationRestDrop>
            {groups.rest.map((entry) => renderEntry(entry))}
          </ConversationRestDrop>
        )}
        {agentsLoading ? (
          agentsError ? (
            <AsyncError error={agentsError} variant="inline" onRetry={() => void retryAgents()} />
          ) : (
            <SkeletonList paddingBlock={8} />
          )
        ) : (
          !holdingList &&
          entries.length === 0 && (
            <div {...stylex.props(styles.empty)}>
              {query ? t('navPanel.searchResultEmpty') : t('messageList.empty')}
            </div>
          )
        )}
        {query.trim() && <NetworkSearchRow query={query.trim()} />}
        <ChannelSync error={channelSync.error} />
        <DragOverlay>
          {draggedEntry ? (
            <div {...stylex.props(styles.dragGhost)}>
              {renderConversation(draggedEntry, 'tile', 'pair')}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </Flexbox>
  );
});

Body.displayName = 'MessageListBody';

export default Body;
