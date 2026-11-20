import { ActionIcon, Button, Flexbox } from '@lobehub/ui';
import type { ChannelPublicMessage } from '@lobot/types';
import * as stylex from '@stylexjs/stylex';
import { ArrowDown, ChevronsUp } from 'lucide-react';
import { Fragment, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useShallow } from 'zustand/react/shallow';

import AsyncBoundary from '@/components/AsyncBoundary';
import AsyncError from '@/components/AsyncError';
import { ChannelConversationSkeleton } from '@/components/Skeleton/Channel';
import { delayed } from '@/components/Skeleton/Delayed';
import { createStore, Provider } from '@/features/Conversation/store';
import { directCounterpart } from '@/features/MessageList/conversations';
import WideScreenContainer from '@/features/WideScreenContainer';
import { useEventCallback } from '@/hooks/useEventCallback';
import { cacheScope } from '@/libs/replica';
import { channelActions, channelSelectors, useChannelStore } from '@/store/channel';
import { useUserStore } from '@/store/user';
import { userProfileSelectors } from '@/store/user/selectors';

import { ArchivedNotice } from './ArchivedNotice';
import { showsListedShell, visibleChannelDetail } from './channelAccess';
import { ChannelDropZone } from './ChannelDropZone';
import { ChannelMessage, ThreadRootMessage } from './ChannelMessage';
import { groupChannelName } from './channelName';
import { ChannelWelcome } from './ChannelWelcome';
import { useAfterCleared } from './clearedChannels';
import { Composer } from './Composer';
import { hasReplyActivity, unresolvedFailures } from './jobStatus';
import { JoinEventLine } from './JoinEventLine';
import { channelTimeline, conversationJoinEvents } from './joinEvents';
import { isCurrentUserMember } from './memberName';
import { consumeChannelJump, useChannelJump } from './messageJump';
import {
  channelTimeFormatters,
  presentChannelTimeline,
  visibleChannelMessages,
} from './messagePresentation';
import { failureAnchors, replyEntries, type ReplyEntry } from './MessageReceipts';
import { firstNewMessageId, unreadFromBeforeVisit } from './newMessages';
import { presentOutgoingMessage, timelineTail } from './outgoing';
import { OutgoingStatus } from './OutgoingStatus';
import { channelTitle } from './peerTitle';
import { channelReadUpTo, threadReadUpTo } from './readUpTo';
import { ReplyActivity } from './ReplyActivity';
import { withoutReplyErrorCards } from './replyError';
import { ReplyFailureMessage } from './ReplyFailureMessage';
import type { ReplyTopic } from './ReplyTopicPanel';
import { styles } from './styles';
import type { ChannelThreadDraft } from './threadDraft';
import { markThreadRead } from './threadReads';
import {
  mayHaveEarlierMentions,
  readPositionBeforeVisit,
  type UnreadMentionRange,
  unreadMentionsOf,
} from './unreadMentions';
import { useChannelEvents } from './useChannelEvents';
import { useChannelProjectName } from './useChannelProjectName';
import { channelDraftKey } from './useComposerDraft';
import { useFollowSent } from './useFollowSent';
import { type ChannelReplyTarget, useReplyTarget } from './useReplyTarget';

interface ChannelConversationProps {
  channelId: string;
  /** Mounted beside a thread panel that covers it, so keep it out of the tab order. */
  inert?: boolean;
  onOpenThread?: (threadId: string, toggle?: boolean) => void;
  onOpenTopic?: (topic: ReplyTopic) => void;
  onStartThread?: (draft: ChannelThreadDraft) => void;
  threadId?: string | null;
}

/** The message a jump scrolls to; older history loads when it is not on the page. */
type JumpTarget = Pick<ChannelReplyTarget, 'id' | 'sequence'>;

const Timeline = ({
  channelId,
  inert,
  threadId = null,
  onOpenThread,
  onOpenTopic,
  onStartThread,
}: ChannelConversationProps) => {
  const { t, i18n } = useTranslation('channel');
  const timeFormats = channelTimeFormatters(i18n.language);
  const [before, setBefore] = useState<number>();
  const reply = useReplyTarget(channelDraftKey(channelId, threadId));
  const [jumpTarget, setJumpTarget] = useState<JumpTarget | null>(null);
  const [highlighted, setHighlighted] = useState<string | null>(null);
  const followSent = useFollowSent(threadId, onOpenThread);
  useEffect(() => {
    if (!highlighted) return;
    const timer = setTimeout(() => setHighlighted(null), 1600);
    return () => clearTimeout(timer);
  }, [highlighted]);
  const params = { before, channelId, threadId };
  const sync = channelActions.useFetchDetail(params);
  const cached = useChannelStore(channelSelectors.detail(params));
  const visible = visibleChannelDetail(cached, sync.error);
  // Scrolling up stacks earlier pages above the open one instead of replacing it.
  const viewKey = `${channelId}:${threadId ?? 'main'}:${before ?? 'latest'}`;
  const [earlier, setEarlier] = useState<{ cursors: number[]; key: string }>({
    cursors: [],
    key: viewKey,
  });
  const earlierCursors = earlier.key === viewKey ? earlier.cursors : [];
  const earlierPages = useChannelStore(
    useShallow((state) =>
      earlierCursors.map((cursor) =>
        channelSelectors.detail({ before: cursor, channelId, threadId })(state),
      ),
    ),
  );
  const loadingEarlier = earlierPages.some((page) => !page);
  const stacked = useMemo(() => {
    if (!visible || !earlierPages.length) return visible;
    const seen = new Set<string>();
    const messages = [...earlierPages]
      .reverse()
      .flatMap((page) => page?.messages ?? [])
      .concat(visible.messages)
      .filter((message) => !seen.has(message.id) && !!seen.add(message.id));
    const oldest = earlierPages.at(-1);
    return { ...visible, hasMore: oldest ? oldest.hasMore : true, messages };
  }, [visible, earlierPages]);
  // A conversation the person deleted shows only what came after, on this device.
  const kept = useAfterCleared(channelId, threadId ? undefined : stacked?.messages);
  const detail = useMemo(
    () =>
      stacked && kept.cleared
        ? { ...stacked, hasMore: false, messages: kept.messages ?? [] }
        : stacked,
    [kept, stacked],
  );
  const listed = useChannelStore(channelSelectors.listed(channelId));
  // Taken while rendering, before this visit marks the conversation read below and the listed
  // counts drop to zero.
  const [mentionsFrom, setMentionsFrom] = useState<UnreadMentionRange | null>(null);
  const readFrom = threadId || mentionsFrom ? null : readPositionBeforeVisit(listed);
  if (listed && readFrom !== null)
    setMentionsFrom({ readFrom, total: listed.mentionCount ?? 0, upTo: listed.sequence });
  // The unread stretch this visit opened on, taken the same way before the read below; the 「新」
  // divider goes above its first message. null once known to hold nothing.
  const [newRange, setNewRange] = useState<{ readFrom: number; upTo: number } | null | undefined>(
    threadId ? null : undefined,
  );
  if (newRange === undefined && listed) {
    const newFrom = unreadFromBeforeVisit(listed);
    setNewRange(newFrom === null ? null : { readFrom: newFrom, upTo: listed.sequence });
  }
  const shell = showsListedShell({ before, error: sync.error, loaded: !!detail, threadId })
    ? listed
    : undefined;
  const channel = detail?.channel ?? shell;
  const scope = cacheScope.use();
  useEffect(() => channelActions.restoreOutbox(scope), [scope]);
  const userId = useUserStore(userProfileSelectors.userId);
  const projectName = useChannelProjectName(channel?.projectId);
  const queued = useChannelStore(channelSelectors.outgoing(channelId, threadId));
  // Sent from this tab and not on a loaded page yet; they follow the latest page only.
  const outgoing = useMemo(() => {
    if (!detail || before !== undefined) return [];
    const member = detail.members.find((entry) => isCurrentUserMember(entry, userId));
    return queued
      .filter((entry) => entry.scope === scope)
      .map((entry) => ({ entry, message: presentOutgoingMessage(entry, { member, userId }) }));
  }, [before, detail, queued, scope, userId]);
  const outgoingById = new Map(outgoing.map((item) => [item.message.id, item.entry]));
  const feedRef = useRef<HTMLDivElement>(null);
  const followLatest = useRef(true);
  // Clicking the button hides it at once. Ignore the in-between scroll events
  // of that animation, or the button flashes back before the feed arrives.
  const settlingToBottom = useRef(false);
  const settleDistance = useRef(0);
  const [awayFromBottom, setAwayFromBottom] = useState(false);
  // Distance from the feed's foot when an earlier page was asked for, so it lands without a jump.
  const earlierAnchor = useRef<number | null>(null);
  const loadEarlier = () => {
    const cursor = detail?.messages[0]?.sequence;
    if (!detail?.hasMore || loadingEarlier || cursor === undefined) return;
    const feed = feedRef.current;
    if (feed) earlierAnchor.current = feed.scrollHeight - feed.scrollTop;
    setEarlier({ cursors: [...earlierCursors, cursor], key: viewKey });
    channelActions
      .refreshDetail({ before: cursor, channelId, threadId })
      .catch((error: unknown) => {
        console.error('Failed to load earlier Channel messages', error);
        earlierAnchor.current = null;
        // Drop the page so scrolling up can ask again.
        setEarlier((current) =>
          current.key === viewKey
            ? { ...current, cursors: current.cursors.filter((entry) => entry !== cursor) }
            : current,
        );
      });
  };
  const oldestShown = detail?.messages[0]?.id;
  useLayoutEffect(() => {
    const feed = feedRef.current;
    if (!feed || earlierAnchor.current === null || loadingEarlier) return;
    feed.scrollTop = feed.scrollHeight - earlierAnchor.current;
    earlierAnchor.current = null;
  }, [oldestShown, loadingEarlier]);
  const syncFollowLatest = (feed: HTMLDivElement) => {
    if (feed.scrollTop < 200) loadEarlier();
    const distance = feed.scrollHeight - feed.scrollTop - feed.clientHeight;
    const atBottom = distance < 64;
    if (settlingToBottom.current) {
      // Still on the way down. A growing distance means the reader scrolled back up.
      if (!atBottom && distance <= settleDistance.current + 1) {
        settleDistance.current = distance;
        return;
      }
      settlingToBottom.current = false;
    }
    followLatest.current = atBottom;
    setAwayFromBottom((away) => (away === !atBottom ? away : !atBottom));
  };
  const feedTail = timelineTail(detail?.messages, outgoing);
  const sequence = detail?.channel.sequence;
  useChannelEvents(params);
  // Messages are memoized, so every handler they get keeps its identity across renders.
  const jumpToMessage = useEventCallback((target: JumpTarget) => {
    followLatest.current = false;
    setJumpTarget(target);
    if (!feedRef.current?.querySelector(`[data-message-id="${target.id}"]`))
      setBefore(target.sequence + 1);
  });
  const openThread = useEventCallback((id: string, toggle?: boolean) => onOpenThread?.(id, toggle));
  const openTopic = useEventCallback((topic: ReplyTopic) => onOpenTopic?.(topic));
  const startThread = useEventCallback((draft: ChannelThreadDraft) => onStartThread?.(draft));
  useEffect(() => {
    if (!jumpTarget) return;
    const node = feedRef.current?.querySelector(`[data-message-id="${jumpTarget.id}"]`);
    if (!node) return;
    node.scrollIntoView({ block: 'center' });
    setHighlighted(jumpTarget.id);
    setJumpTarget(null);
  }, [detail, jumpTarget]);
  // A jump asked from outside (a search result) waits for the first page, so a message already
  // on it scrolls into view instead of reopening the history at it.
  const externalJump = useChannelJump(channelId, threadId);
  const loaded = !!detail;
  useEffect(() => {
    if (!externalJump || !loaded) return;
    consumeChannelJump(externalJump);
    jumpToMessage(externalJump);
  }, [externalJump, loaded]);

  useEffect(() => {
    const feed = feedRef.current;
    if (feed && followLatest.current && before === undefined) {
      feed.scrollTop = feed.scrollHeight;
      setAwayFromBottom(false);
    }
  }, [feedTail, before]);

  // Read up to what the list already counts, so the badge clears on open instead of after the
  // page refresh catches up with it.
  const readUpTo = threadId ? undefined : channelReadUpTo(sequence, listed?.sequence);
  useEffect(() => {
    if (threadId || readUpTo === undefined || before !== undefined) return;
    void channelActions
      .markRead(channelId, readUpTo)
      .catch((error: unknown) => console.error('Failed to mark Channel read', error));
  }, [channelId, threadId, readUpTo, before]);

  // The server's read position is per Channel, so an open thread records its own on this device,
  // up to the news the main view's thread list shows for it (where its unread dot comes from).
  const listedThread = useChannelStore((state) =>
    threadId
      ? channelSelectors
          .detail({ channelId, threadId: null })(state)
          ?.threads.find((entry) => entry.id === threadId)
      : undefined,
  );
  const threadReadAt =
    threadId && before === undefined
      ? threadReadUpTo(detail?.messages.at(-1)?.createdAt, listedThread)
      : undefined;
  useEffect(() => {
    if (threadId && threadReadAt !== undefined) markThreadRead(threadId, threadReadAt);
  }, [threadId, threadReadAt]);

  const activeMembers = detail?.members.filter((member) => member.status === 'active') ?? [];
  const thread = threadId ? detail?.threads.find((entry) => entry.id === threadId) : undefined;
  const selectReply = useEventCallback((message: ChannelPublicMessage) => reply.select(message));
  const [mentionRequest, setMentionRequest] = useState(0);
  // A reply that cannot run again passes the request on: answer it and @ someone else.
  const handOff = useEventCallback((job: ReplyEntry['job']) => {
    const request = detail?.messages.find((message) => message.id === job.messageId);
    if (request) reply.select(request);
    setMentionRequest((count) => count + 1);
  });
  const channelArchived = channel?.status === 'archived';
  const oneToOne = !!(channel?.agentId || channel?.peerUserId);
  const messages = detail ? visibleChannelMessages(detail.messages, detail.threads) : [];
  // Unread @mentions of the viewer on the loaded pages, oldest first; each is dropped once jumped
  // to. More may sit on pages not loaded yet, until the history reaches the read position.
  const [seenMentions, setSeenMentions] = useState<ReadonlySet<string>>(() => new Set());
  const foundMentions =
    detail && mentionsFrom ? unreadMentionsOf(messages, detail.members, userId, mentionsFrom) : [];
  const nextMention = foundMentions.find((message) => !seenMentions.has(message.id));
  const pendingMentions = foundMentions.filter((message) => !seenMentions.has(message.id)).length;
  const searchEarlierMentions =
    !!detail &&
    !!mentionsFrom &&
    foundMentions.length < mentionsFrom.total &&
    mayHaveEarlierMentions(detail.messages[0]?.sequence, detail.hasMore, mentionsFrom.readFrom);
  const [seekingMention, setSeekingMention] = useState(false);
  const seekCursor = useRef<number | undefined>(undefined);
  const jumpToNextMention = useEventCallback(() => {
    if (nextMention) {
      setSeekingMention(false);
      setSeenMentions((seen) => new Set(seen).add(nextMention.id));
      jumpToMessage(nextMention);
      return;
    }
    if (!searchEarlierMentions) return setSeekingMention(false);
    // A page that failed to load leaves the oldest message where it was: stop instead of retrying.
    const cursor = detail?.messages[0]?.sequence;
    if (seekingMention && seekCursor.current === cursor) return setSeekingMention(false);
    seekCursor.current = cursor;
    setSeekingMention(true);
    loadEarlier();
  });
  // Pages back until the history holds an unread mention or reaches the read position.
  useEffect(() => {
    if (seekingMention && !loadingEarlier) jumpToNextMention();
  }, [seekingMention, loadingEarlier, detail, jumpToNextMention]);
  const timeline = detail
    ? channelTimeline(
        outgoing.length ? [...messages, ...outgoing.map((item) => item.message)] : messages,
        conversationJoinEvents(detail, threadId ?? undefined),
        !detail.hasMore && before === undefined,
      )
    : [];
  // Failed replies this conversation still owes, each after what its Agent already said. One the
  // server already posted an error card for shows only that card.
  const failures = detail
    ? failureAnchors(
        messages,
        replyEntries(
          detail,
          withoutReplyErrorCards(
            unresolvedFailures(
              (detail.jobs ?? []).filter((job) => (job.threadId ?? null) === (threadId ?? null)),
            ),
            messages,
          ),
          t('unnamedAgent'),
        ),
      )
    : new Map<string, ReplyEntry[]>();
  const presented = presentChannelTimeline(timeline);
  const firstNewId = newRange
    ? firstNewMessageId(
        timeline.flatMap((entry) =>
          entry.kind === 'message' && !outgoingById.has(entry.message.id) ? [entry.message] : [],
        ),
        newRange,
        userId,
      )
    : undefined;

  return (
    <ChannelDropZone
      disabled={inert || channelArchived || thread?.status === 'archived'}
      draftKey={channelDraftKey(channelId, threadId)}
    >
      <Flexbox
        data-channel-conversation={threadId || 'main'}
        inert={inert}
        {...stylex.props(styles.body)}
      >
        <AsyncBoundary
          data={detail ?? shell}
          error={sync.error}
          errorVariant="page"
          isLoading={!detail && !shell && !sync.error}
          // Delayed so a fast fetch (switching Channels, opening a thread) paints no placeholder;
          // right after the route skeleton it hands over immediately.
          loading={delayed(<ChannelConversationSkeleton />)}
          onRetry={() => void channelActions.refreshDetail(params)}
        >
          {channel && (
            <>
              {!!detail && !!sync.error && (
                <AsyncError
                  error={sync.error}
                  variant="inline"
                  onRetry={() => void channelActions.refreshDetail(params)}
                />
              )}
              {detail ? (
                <div {...stylex.props(styles.feedFrame)}>
                  <Flexbox
                    aria-label={t(threadId ? 'thread' : 'main')}
                    ref={feedRef}
                    onScroll={(event) => syncFollowLatest(event.currentTarget)}
                    {...stylex.props(styles.feed)}
                  >
                    <WideScreenContainer fullWidth paddingInline={16}>
                      {(detail.hasMore || before !== undefined) && (
                        <Flexbox
                          horizontal
                          align="center"
                          gap={8}
                          justify="center"
                          paddingBlock={8}
                        >
                          <Button
                            disabled={!detail.hasMore}
                            loading={loadingEarlier}
                            size="small"
                            onClick={loadEarlier}
                          >
                            {t('olderMessages')}
                          </Button>
                          {before !== undefined && (
                            <Button
                              size="small"
                              type="text"
                              onClick={() => {
                                followLatest.current = true;
                                setBefore(undefined);
                              }}
                            >
                              {t('latestMessages')}
                            </Button>
                          )}
                        </Flexbox>
                      )}
                      {detail.rootMessage && (
                        <ThreadRootMessage
                          detail={detail}
                          highlighted={highlighted === detail.rootMessage.id}
                          root={detail.rootMessage}
                          onReply={
                            channelArchived || thread?.status === 'archived'
                              ? undefined
                              : selectReply
                          }
                        />
                      )}
                      {/* The welcome heads the whole history, so it shows only above its first page. */}
                      {!threadId && !detail.hasMore && before === undefined && (
                        <ChannelWelcome
                          detail={detail}
                          onGreet={
                            // Once anyone has spoken, there is nothing left to break the ice for.
                            channelArchived || timeline.some((entry) => entry.kind === 'message')
                              ? undefined
                              : (content) => {
                                  followLatest.current = true;
                                  followSent(
                                    channelActions.queueSend({
                                      attachments: [],
                                      channelId,
                                      content,
                                      fileIds: [],
                                      mentions: [],
                                      threadId,
                                    }),
                                  );
                                }
                          }
                        />
                      )}
                      {threadId && !timeline.length && (
                        <p {...stylex.props(styles.muted)}>{t('threadEmpty')}</p>
                      )}
                      {presented.map(({ item, date, startsDay, continuation }, index) => {
                        const previous = presented[index - 1]?.item;
                        // A failed reply posted in between ends the run of the same author.
                        if (previous?.kind === 'message' && failures.has(previous.message.id))
                          continuation = false;
                        const startsNew = item.kind === 'message' && item.message.id === firstNewId;
                        // The first new message starts its own run, under the divider.
                        if (startsNew) continuation = false;
                        return (
                          <Fragment key={item.kind === 'event' ? item.event.id : item.message.id}>
                            {startsDay && (
                              <div
                                aria-label={timeFormats.date.format(date)}
                                role="separator"
                                {...stylex.props(styles.dateDivider)}
                              >
                                <time
                                  dateTime={date.toISOString()}
                                  title={timeFormats.date.format(date)}
                                >
                                  {timeFormats.date.format(date)}
                                </time>
                              </div>
                            )}
                            {startsNew && (
                              <div
                                aria-label={t('newMessages')}
                                role="separator"
                                {...stylex.props(styles.newDivider)}
                              >
                                <span {...stylex.props(styles.newDividerLine)} />
                                <span>{t('newMessages')}</span>
                                <span {...stylex.props(styles.newDividerLine)} />
                              </div>
                            )}
                            {item.kind === 'event' ? (
                              <JoinEventLine event={item.event} />
                            ) : outgoingById.has(item.message.id) ? (
                              <ChannelMessage
                                continuation={continuation}
                                message={item.message}
                                pending={outgoingById.get(item.message.id)!.status === 'sending'}
                                threadId={threadId}
                                delivery={
                                  <OutgoingStatus
                                    message={outgoingById.get(item.message.id)!}
                                    onRetry={(failed) =>
                                      followSent(channelActions.retrySend(failed))
                                    }
                                  />
                                }
                                detail={{
                                  ...detail,
                                  attachments: outgoingById.get(item.message.id)!.attachments,
                                }}
                                onJumpToMessage={jumpToMessage}
                              />
                            ) : (
                              <ChannelMessage
                                continuation={continuation}
                                detail={detail}
                                highlighted={highlighted === item.message.id}
                                message={item.message}
                                threadId={threadId}
                                onJumpToMessage={jumpToMessage}
                                onOpenThread={onOpenThread && openThread}
                                onOpenTopic={onOpenTopic && openTopic}
                                onReply={
                                  channelArchived || thread?.status === 'archived'
                                    ? undefined
                                    : selectReply
                                }
                                onStartThread={
                                  channelArchived || !onStartThread ? undefined : startThread
                                }
                              />
                            )}
                            {item.kind === 'message' &&
                              failures
                                .get(item.message.id)
                                ?.map((entry) => (
                                  <ReplyFailureMessage
                                    detail={detail}
                                    entry={entry}
                                    key={entry.job.id}
                                    onHandoff={
                                      channelArchived || thread?.status === 'archived'
                                        ? undefined
                                        : () => handOff(entry.job)
                                    }
                                  />
                                ))}
                          </Fragment>
                        );
                      })}
                    </WideScreenContainer>
                  </Flexbox>
                  {(pendingMentions > 0 || searchEarlierMentions) && (
                    <Button
                      icon={ChevronsUp}
                      loading={seekingMention}
                      shape="round"
                      onClick={jumpToNextMention}
                      {...stylex.props(styles.jumpToMention)}
                    >
                      {pendingMentions > 0
                        ? t('mentionJump.count', { count: pendingMentions })
                        : t('mentionJump.earlier')}
                    </Button>
                  )}
                  {awayFromBottom && (
                    <div {...stylex.props(styles.jumpToBottom)}>
                      <ActionIcon
                        glass
                        icon={ArrowDown}
                        size={{ blockSize: 36, borderRadius: 36, size: 18 }}
                        title={t('latestMessages')}
                        variant={'outlined'}
                        onClick={() => {
                          followLatest.current = true;
                          settlingToBottom.current = true;
                          settleDistance.current = Number.POSITIVE_INFINITY;
                          setAwayFromBottom(false);
                          if (before !== undefined) {
                            setBefore(undefined);
                            return;
                          }
                          const feed = feedRef.current;
                          if (feed) feed.scrollTo({ behavior: 'smooth', top: feed.scrollHeight });
                        }}
                      />
                    </div>
                  )}
                </div>
              ) : (
                // Opened before its first page arrives: no placeholder, just the input, so the
                // conversation is usable at once and fills in when it loads.
                <Flexbox aria-label={t('main')} {...stylex.props(styles.feed)} />
              )}
              {channelArchived || thread?.status === 'archived' ? (
                <ArchivedNotice channel={channel} threadId={threadId} />
              ) : (
                <Composer
                  channel={channel}
                  draftKey={channelDraftKey(channelId, threadId)}
                  key={channelDraftKey(channelId, threadId)}
                  members={activeMembers}
                  mentionRequest={mentionRequest}
                  replyTarget={reply.target}
                  activity={
                    detail && hasReplyActivity(detail, threadId) ? (
                      <ReplyActivity detail={detail} threadId={threadId} />
                    ) : null
                  }
                  placeholder={
                    threadId
                      ? t('threadComposer')
                      : t(oneToOne ? 'directComposer' : 'composer', {
                          name: detail
                            ? channelTitle(detail, userId, projectName)
                            : directCounterpart(channel)?.name ||
                              groupChannelName(channel, projectName),
                        })
                  }
                  onCancelReply={() => reply.clear()}
                  onQueue={(message) => {
                    // A reply picked while outsiders were being invited stays for the next message.
                    if (reply.snapshot().target?.id === message.replyToId) reply.clear();
                    followLatest.current = true;
                    setBefore(undefined);
                    followSent(channelActions.queueSend({ ...message, channelId, threadId }));
                  }}
                />
              )}
            </>
          )}
        </AsyncBoundary>
      </Flexbox>
    </ChannelDropZone>
  );
};

/** Each mounted conversation owns its editor, scroll position and execution scope. */
export function ChannelConversation(props: ChannelConversationProps) {
  const { channelId, threadId } = props;
  const scope = cacheScope.use();
  return (
    <Provider
      key={`${scope}:${channelId}:${threadId ?? 'main'}`}
      createStore={() =>
        createStore({
          context: { agentId: `channel:${channelId}`, topicId: threadId },
          messages: [],
          skipFetch: true,
        })
      }
    >
      <Timeline {...props} />
    </Provider>
  );
}
