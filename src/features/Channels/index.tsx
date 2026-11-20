import { Flexbox, Tag, Text } from '@lobehub/ui';
import * as stylex from '@stylexjs/stylex';
import { useSize } from 'ahooks';
import { useEffect, useId, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useSearchParams } from 'react-router';

import { EntityLinkHostProvider } from '@/features/EntityLink/host';
import { directCounterpart } from '@/features/MessageList/conversations';
import NavHeader from '@/features/NavHeader';
import { useCompactLayout } from '@/features/NavRail/useCompactLayout';
import { channelActions, channelSelectors, useChannelStore } from '@/store/channel';
import { useChatStore } from '@/store/chat';
import { useUserStore } from '@/store/user';
import { userProfileSelectors } from '@/store/user/selectors';

import { AgentProfilePanel } from './AgentProfilePanel';
import { isChannelGone, visibleChannelDetail } from './channelAccess';
import { ChannelConversation } from './ChannelConversation';
import { ChannelEmpty } from './ChannelEmpty';
import { ChannelHeaderTitle } from './ChannelHeaderTitle';
import { groupChannelName } from './channelName';
import { ChannelSearchBox, ChannelSearchPanel } from './ChannelSearch';
import { ChannelSyncing } from './ChannelSyncing';
import { headerHoverMarker } from './markers.stylex';
import { MEMBER_FLOAT_BREAKPOINT, MemberPanel } from './MemberPanel';
import { ChannelMenu, MemberStatus } from './MemberStatus';
import { omitChannelMessageLink, readChannelMessageLink, requestChannelJump } from './messageJump';
import { openTopic } from './openTopic';
import { channelTitle } from './peerTitle';
import { CHANNEL_ENTITY_PORTAL_SCOPE, PortalPanel } from './PortalPanel';
import { type ReplyTopic, ReplyTopicPanel } from './ReplyTopicPanel';
import { ChannelSettingsPanel } from './Settings/Panel';
import { CHANNEL_SETTINGS_PARAM, useOpenChannelSettings } from './Settings/tabs';
import { styles } from './styles';
import { ThreadsButton } from './ThreadBrowser';
import { ThreadPageActions, ThreadPageTitle } from './ThreadPageTitle';
import { THREAD_FLOAT_BREAKPOINT, ThreadPanel } from './ThreadPanel';
import { useChannelProjectName } from './useChannelProjectName';
import { channelBrowserSessionId, usePortalPanelOpen } from './usePortalPanel';
import { useThreadPanel } from './useThreadPanel';

/** One Channel: the main conversation, with a thread beside it, or one thread as the page. */
export default function ChannelPage() {
  const { t } = useTranslation('channel');
  const { channelId } = useParams<{ channelId: string }>();
  const panel = useThreadPanel(channelId ?? '');
  const compact = useCompactLayout();
  const [membersChannelId, setMembersChannelId] = useState<string | null>(null);
  const memberPanelId = useId();
  const searchPanelId = useId();
  const settingsPanelId = useId();
  const [searchParams, setSearchParams] = useSearchParams();
  const messageId = searchParams.get('message');
  const messageSequence = searchParams.get('sequence');
  const messageThreadId = searchParams.get('thread');
  // A notification (or any message link) names the message. Ask that conversation to reveal it,
  // then drop the location so the address stays the Channel or thread the reader is now in.
  useEffect(() => {
    if (!channelId || !messageId || messageSequence === null) return;
    const params = new URLSearchParams();
    params.set('message', messageId);
    params.set('sequence', messageSequence);
    if (messageThreadId) params.set('thread', messageThreadId);
    const linked = readChannelMessageLink(params);
    if (!linked) return;
    requestChannelJump({ channelId, ...linked });
    setSearchParams((current) => omitChannelMessageLink(current), { replace: true });
  }, [channelId, messageId, messageSequence, messageThreadId, setSearchParams]);
  const settingsRequested = searchParams.has(CHANNEL_SETTINGS_PARAM);
  const openSettings = useOpenChannelSettings();
  // The box keeps its text per Channel; the panel shows the query last submitted.
  const [searchInput, setSearchInput] = useState({ channelId: '', value: '' });
  // The header field starts as an icon. Opening it is separate from submitting a query.
  const [searchFieldOpen, setSearchFieldOpen] = useState(false);
  const [searchFieldChannelId, setSearchFieldChannelId] = useState(channelId);
  const [search, setSearch] = useState<{ channelId: string; query: string } | null>(null);
  const conversationRef = useRef<HTMLDivElement>(null);
  const conversationWidth = useSize(conversationRef)?.width;
  // Shares the main conversation's request; the header and thread panel read the same view.
  const view = { channelId: channelId ?? '', threadId: null };
  const sync = channelActions.useFetchDetail(channelId ? view : null);
  const detail = visibleChannelDetail(useChannelStore(channelSelectors.detail(view)), sync.error);
  // The list row stands in while the detail loads, so the header never falls back to "Channel".
  const listItem = useChannelStore((s) =>
    channelSelectors.list(s)?.find((item) => item.id === channelId),
  );
  const directAgentId = (detail?.channel ?? listItem)?.agentId ?? undefined;
  const isDirect = !!directAgentId;
  const isPeer = !!(detail?.channel ?? listItem)?.peerUserId;
  const isSharedAgent = !!(detail?.channel.sharedAgent || listItem?.sharedAgent);
  const viewerId = useUserStore(userProfileSelectors.userId);
  const projectName = useChannelProjectName((detail?.channel ?? listItem)?.projectId);
  const directAgent = detail?.channel.agentId
    ? detail.members.find((member) => member.agentId === detail.channel.agentId)
    : undefined;
  const [topic, setTopic] = useState<(ReplyTopic & { channelId: string }) | null>(null);
  const portalOpen = usePortalPanelOpen();
  const clearPortalStack = useChatStore((s) => s.clearPortalStack);
  const openBrowser = useChatStore((s) => s.openBrowser);
  // One side panel at a time. A report or web page covers whatever was open and uncovers it
  // when closed; explicitly opening another panel closes it.
  const threadId = portalOpen ? null : panel.threadId;
  const threadDraft = portalOpen ? null : panel.draft;
  const pageThreadId = panel.pageThreadId;
  // A direct conversation's side panel is its Agent's profile; any other Channel's, in a
  // workspace or the personal space, is the roster.
  const hasMemberPanel = !!directAgent || (!!detail && !detail.channel.agentId);
  const membersOpen =
    hasMemberPanel && membersChannelId === channelId && !threadId && !threadDraft && !portalOpen;
  // Only a group its viewer manages has settings; a report covers them like a thread.
  const settingsOpen =
    settingsRequested &&
    !!detail?.channel.canDelete &&
    !detail.channel.agentId &&
    !detail.channel.peerUserId &&
    !threadId &&
    !threadDraft &&
    !portalOpen;
  // Only when they are open: setSearchParams starts from this render's URL, so a write here
  // would put back a thread that panel.close() just removed in the same handler.
  const closeSettings = () =>
    settingsRequested &&
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current);
        next.delete(CHANNEL_SETTINGS_PARAM);
        return next;
      },
      { replace: true },
    );
  // Settings open from the header menu and the welcome card through the URL; they replace
  // whichever side panel was open.
  useEffect(() => {
    if (!settingsRequested) return;
    setMembersChannelId(null);
    setSearch(null);
    setTopic(null);
    clearPortalStack();
    if (!pageThreadId) panel.close();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only when the settings open
  }, [settingsRequested]);
  const visibleTopic = openTopic(topic, channelId, {
    portal: portalOpen,
    members: membersOpen,
    thread: !!(threadId || threadDraft || pageThreadId),
  });
  // A thread, the roster, a report or a reply topic covers the results; closing it uncovers them.
  const searchOpen =
    search?.channelId === channelId &&
    !threadId &&
    !threadDraft &&
    !portalOpen &&
    !membersOpen &&
    !visibleTopic;
  if (!channelId) return null;
  const searchValue = searchInput.channelId === channelId ? searchInput.value : '';
  // Opening the field belongs to one Channel. A switch closes it on this render.
  if (searchFieldChannelId !== channelId) {
    setSearchFieldChannelId(channelId);
    setSearchFieldOpen(false);
  }
  const headerSearchOpen = (searchFieldChannelId === channelId && searchFieldOpen) || !!searchValue;
  const openSearch = (query: string) => {
    if (!pageThreadId) panel.close();
    setMembersChannelId(null);
    setTopic(null);
    clearPortalStack();
    closeSettings();
    setSearch({ channelId, query });
  };
  // The threads button and a busy member's conversations open a Thread the same way.
  const openThread = (nextThreadId: string) => {
    // The open thread stays open rather than toggling off.
    if (nextThreadId === (pageThreadId ?? threadId)) return;
    // A thread page switches in place; the feed opens the thread beside it.
    if (pageThreadId) return panel.openPage(nextThreadId);
    setSearch(null);
    setTopic(null);
    clearPortalStack();
    // Under a report the thread only looks closed, so bring it back, don't toggle it off.
    panel.openThread(nextThreadId, !portalOpen);
  };
  // A main-feed hit scrolls the feed; a Thread hit opens that Thread over the results.
  const openSearchHit = (hit: { id: string; sequence: number; threadId: string | null }) => {
    requestChannelJump({ channelId, id: hit.id, sequence: hit.sequence, threadId: hit.threadId });
    if (hit.threadId) {
      if (pageThreadId) panel.openPage(hit.threadId);
      else if (panel.threadId !== hit.threadId) panel.openThread(hit.threadId);
    } else if (pageThreadId) panel.close();
  };
  // A removed or out-of-reach Channel (e.g. a link from another workspace) leaves nothing open.
  if (isChannelGone(sync.error)) return <ChannelEmpty />;

  // A docked thread is a second column. Its header lines up with the channel header,
  // so the channel header stops at the column edge instead of spanning over the thread.
  const threadDocked =
    !pageThreadId &&
    !!(threadId || threadDraft) &&
    (conversationWidth ?? 1000) >= THREAD_FLOAT_BREAKPOINT;
  // Shared by the group roster toggle and the direct Agent's title-menu entry.
  const toggleMemberPanel = () => {
    if (!membersOpen) {
      // A thread page stays; only a side panel is replaced.
      if (!pageThreadId) panel.close();
      setSearch(null);
      setTopic(null);
      clearPortalStack();
      closeSettings();
    }
    setMembersChannelId(membersOpen ? null : channelId);
  };
  const toggleChannelSettings = () => {
    if (settingsOpen) closeSettings();
    else openSettings();
  };
  const canOpenChannelSettings = !!detail?.channel.canDelete && !isDirect && !isPeer;
  const header = (
    <NavHeader
      // The rule separates the feed. The marker reveals the title's "more" button on hover.
      {...stylex.props(headerHoverMarker, styles.threadHeader)}
      // A thread page leads back to its Channel itself; a second back to the list would compete.
      showTogglePanelButton={!(compact && pageThreadId)}
      left={
        pageThreadId && detail ? (
          <ThreadPageTitle
            detail={detail}
            threadId={pageThreadId}
            onBack={panel.close}
            onSwitch={panel.openPage}
          />
        ) : (
          <Flexbox horizontal align="center" gap={8}>
            {/* A left click on the name opens settings; a right click opens the same menu as "…". */}
            <ChannelHeaderTitle
              detail={detail}
              showHash={!isDirect && !isPeer}
              title={
                detail
                  ? channelTitle(detail, viewerId, projectName)
                  : listItem &&
                    (directCounterpart(listItem)?.name || groupChannelName(listItem, projectName))
              }
              onToggleAgentPanel={isDirect && hasMemberPanel ? toggleMemberPanel : undefined}
              onToggleChannelSettings={canOpenChannelSettings ? toggleChannelSettings : undefined}
            />
            {isSharedAgent && (
              <Text style={{ flex: 'none' }} type="secondary">
                {t('sharedAgent.tag')}
              </Text>
            )}
            {detail?.channel.status === 'archived' && <Tag size="small">{t('archived')}</Tag>}
            {/* The Channel's own actions sit by its name; the right holds the panels it opens. */}
            {detail && (
              <ChannelMenu
                detail={detail}
                onToggleAgentPanel={isDirect && hasMemberPanel ? toggleMemberPanel : undefined}
              />
            )}
            <ChannelSyncing failed={!!sync.error} params={view} />
          </Flexbox>
        )
      }
      right={
        detail && (
          <Flexbox horizontal align="center" gap={headerSearchOpen ? 0 : 8}>
            {!headerSearchOpen && pageThreadId && (
              <ThreadPageActions detail={detail} threadId={pageThreadId} />
            )}
            {!headerSearchOpen && (
              <ThreadsButton
                activeId={pageThreadId ?? threadId}
                detail={detail}
                onOpen={openThread}
              />
            )}
            {!headerSearchOpen && (
              <MemberStatus
                detail={detail}
                memberPanel={
                  hasMemberPanel
                    ? {
                        id: memberPanelId,
                        open: membersOpen,
                        onToggle: toggleMemberPanel,
                      }
                    : undefined
                }
                onOpenThread={openThread}
              />
            )}
            {/* An icon until opened; the field then covers the other buttons on this side. */}
            <ChannelSearchBox
              key={channelId}
              value={searchValue}
              onChange={(value) => setSearchInput({ channelId, value })}
              onOpenChange={setSearchFieldOpen}
              onSearch={openSearch}
            />
          </Flexbox>
        )
      }
    />
  );
  return (
    <Flexbox {...stylex.props(styles.layout)}>
      {!threadDocked && header}
      <EntityLinkHostProvider
        portal={CHANNEL_ENTITY_PORTAL_SCOPE}
        onOpenSideBrowser={(url) => openBrowser(channelBrowserSessionId(channelId), url)}
      >
        {/* Keyed by Channel: switching rebuilds the whole area, so nothing the last Channel left
            in it (a conversation whose unmount did not take its DOM) stays beside the new one. */}
        <Flexbox
          horizontal
          key={channelId}
          ref={conversationRef}
          {...stylex.props(styles.conversations)}
        >
          <Flexbox {...stylex.props(styles.channelColumn)}>
            {threadDocked && header}
            {pageThreadId ? (
              <ChannelConversation
                channelId={channelId}
                key={`${channelId}:${pageThreadId}`}
                threadId={pageThreadId}
                inert={
                  ((membersOpen || searchOpen || settingsOpen) &&
                    (conversationWidth ?? 1000) < MEMBER_FLOAT_BREAKPOINT) ||
                  (portalOpen && (conversationWidth ?? 1000) < THREAD_FLOAT_BREAKPOINT)
                }
              />
            ) : (
              <ChannelConversation
                channelId={channelId}
                key={channelId}
                inert={
                  (!!(threadId || threadDraft || portalOpen) &&
                    (conversationWidth ?? 1000) < THREAD_FLOAT_BREAKPOINT) ||
                  ((membersOpen || searchOpen || settingsOpen) &&
                    (conversationWidth ?? 1000) < MEMBER_FLOAT_BREAKPOINT) ||
                  (!!visibleTopic && (conversationWidth ?? 1000) < THREAD_FLOAT_BREAKPOINT)
                }
                onOpenThread={(nextThreadId, toggle) => {
                  setTopic(null);
                  // A send that finishes behind an open report (toggle: false) must not close it.
                  if (toggle !== false) clearPortalStack();
                  // Under a report the thread only looks closed, so bring it back, don't toggle it off.
                  panel.openThread(nextThreadId, portalOpen ? false : toggle);
                }}
                onOpenTopic={(next) => {
                  panel.close();
                  setSearch(null);
                  setMembersChannelId(null);
                  clearPortalStack();
                  closeSettings();
                  setTopic({ ...next, channelId });
                }}
                onStartThread={(draft) => {
                  setSearch(null);
                  setTopic(null);
                  clearPortalStack();
                  closeSettings();
                  panel.openDraft(draft);
                }}
              />
            )}
          </Flexbox>
          {detail &&
            membersOpen &&
            (directAgent?.agentId ? (
              <AgentProfilePanel
                agentId={directAgent.agentId}
                availableWidth={conversationWidth}
                channelId={detail.channel.id}
                id={memberPanelId}
                key={directAgent.agentId}
                member={directAgent}
                manageable={
                  directAgent.status === 'active' &&
                  detail.channel.canDelete &&
                  detail.channel.status !== 'archived'
                }
                onClose={() => setMembersChannelId(null)}
              />
            ) : (
              <MemberPanel
                availableWidth={conversationWidth}
                detail={detail}
                id={memberPanelId}
                onClose={() => setMembersChannelId(null)}
                onOpenThread={openThread}
              />
            ))}
          {detail && settingsOpen && (
            <ChannelSettingsPanel
              availableWidth={conversationWidth}
              channel={detail.channel}
              id={settingsPanelId}
              key={detail.channel.id}
              onClose={closeSettings}
            />
          )}
          {searchOpen && search && (
            <ChannelSearchPanel
              availableWidth={conversationWidth}
              channelId={channelId}
              id={searchPanelId}
              key={`${channelId}:${search.query}`}
              query={search.query}
              onClose={() => setSearch(null)}
              onOpen={openSearchHit}
            />
          )}
          <ReplyTopicPanel
            availableWidth={conversationWidth}
            topic={visibleTopic}
            onClose={() => setTopic(null)}
          />
          {detail && (
            <ThreadPanel
              availableWidth={conversationWidth}
              detail={detail}
              draft={threadDraft}
              key={`thread:${channelId}`}
              threadId={threadId}
              onClose={panel.close}
              onOpenPage={panel.openPage}
              onSendDraft={panel.send}
            />
          )}
          <PortalPanel availableWidth={conversationWidth} channelId={channelId} />
        </Flexbox>
      </EntityLinkHostProvider>
    </Flexbox>
  );
}
