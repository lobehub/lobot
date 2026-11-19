import { Button, Flexbox } from '@lobehub/ui';
import type { ChannelPublicMessage } from '@lobot/types';
import * as stylex from '@stylexjs/stylex';
import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

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
import { presentOutgoingMessage, timelineTail } from './outgoing';
import { OutgoingStatus } from './OutgoingStatus';
import { channelTitle } from './peerTitle';
import { ReplyActivity } from './ReplyActivity';
import { ReplyFailureMessage } from './ReplyFailureMessage';
import type { ReplyTopic } from './ReplyTopicPanel';
import { styles } from './styles';
import type { ChannelThreadDraft } from './threadDraft';
import { markThreadRead } from './threadReads';
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
  // A conversation the person deleted shows only what came after, on this device.
  const kept = useAfterCleared(channelId, threadId ? undefined : visible?.messages);
  const detail = useMemo(
    () =>
      visible && kept.cleared
        ? { ...visible, hasMore: false, messages: kept.messages ?? [] }
        : visible,
    [kept, visible],
  );
  const listed = useChannelStore(channelSelectors.listed(channelId));
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
    if (feed && followLatest.current && before === undefined) feed.scrollTop = feed.scrollHeight;
  }, [feedTail, before]);

  useEffect(() => {
    if (threadId || sequence === undefined || before !== undefined) return;
    void channelActions
      .markRead(channelId, sequence)
      .catch((error: unknown) => console.error('Failed to mark Channel read', error));
  }, [channelId, threadId, sequence, before]);

  // The server's read position is per Channel, so an open thread records its own on this device.
  const newestInThread = threadId && before === undefined ? detail?.messages.at(-1) : undefined;
  useEffect(() => {
    if (threadId && newestInThread) markThreadRead(threadId, newestInThread.createdAt);
  }, [threadId, newestInThread]);

  const activeMembers = detail?.members.filter((member) => member.status === 'active') ?? [];
  const thread = threadId ? detail?.threads.find((entry) => entry.id === threadId) : undefined;
  const selectReply = useEventCallback((message: ChannelPublicMessage) => reply.select(message));
  const channelArchived = channel?.status === 'archived';
  const oneToOne = !!(channel?.agentId || channel?.peerUserId);
  const messages = detail ? visibleChannelMessages(detail.messages, detail.threads) : [];
  const timeline = detail
    ? channelTimeline(
        outgoing.length ? [...messages, ...outgoing.map((item) => item.message)] : messages,
        conversationJoinEvents(detail, threadId ?? undefined),
        !detail.hasMore && before === undefined,
      )
    : [];
  // Failed replies this conversation still owes, each after what its Agent already said.
  const failures = detail
    ? failureAnchors(
        messages,
        replyEntries(
          detail,
          unresolvedFailures(
            (detail.jobs ?? []).filter((job) => (job.threadId ?? null) === (threadId ?? null)),
          ),
          t('unnamedAgent'),
        ),
      )
    : new Map<string, ReplyEntry[]>();
  const presented = presentChannelTimeline(timeline);

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
                <Flexbox
                  aria-label={t(threadId ? 'thread' : 'main')}
                  ref={feedRef}
                  onScroll={(event) => {
                    const feed = event.currentTarget;
                    followLatest.current =
                      feed.scrollHeight - feed.scrollTop - feed.clientHeight < 64;
                  }}
                  {...stylex.props(styles.feed)}
                >
                  <WideScreenContainer fullWidth paddingInline={16}>
                    {(detail.hasMore || before !== undefined) && (
                      <Flexbox horizontal align="center" gap={8} justify="center" paddingBlock={8}>
                        <Button
                          disabled={!detail.hasMore}
                          size="small"
                          onClick={() => setBefore(detail.messages[0]?.sequence)}
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
                          channelArchived || thread?.status === 'archived' ? undefined : selectReply
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
                                  onRetry={(failed) => followSent(channelActions.retrySend(failed))}
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
                                />
                              ))}
                        </Fragment>
                      );
                    })}
                  </WideScreenContainer>
                </Flexbox>
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
