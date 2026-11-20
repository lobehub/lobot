import {
  ActionIcon,
  confirmModal,
  copyToClipboard,
  Divider,
  DropdownMenu,
  Flexbox,
  Icon,
  Text,
  toast,
} from '@lobehub/ui';
import type { ChannelDetail, ChannelPublicMember, ChannelPublicMessage } from '@lobot/types';
import { contactCardOf } from '@lobot/types';
import * as stylex from '@stylexjs/stylex';
import {
  ChevronsDownUp,
  ChevronsUpDown,
  Copy,
  MessagesSquare,
  MoreHorizontal,
  PencilLine,
  Reply,
  Trash2,
} from 'lucide-react';
import type { FC, ReactNode, RefObject } from 'react';
import { memo, useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import AgentAvatar from '@/components/AgentAvatar';
import CollapsibleContent from '@/components/CollapsibleContent';
import PersonAvatar from '@/components/UserAvatar';
import AgentProfilePopup from '@/features/AgentProfileCard/AgentProfilePopup';
import { localizeCardFallback } from '@/features/ContactCardShare/cardText';
import { ContactCardMessage } from '@/features/ContactCardShare/ContactCardMessage';
import { ChatItem } from '@/features/Conversation/ChatItem';
import Markdown from '@/features/Conversation/Markdown';
import LobeAgentsElement from '@/features/Conversation/Markdown/plugins/LobeAgents';
import LocalFileElement from '@/features/Conversation/Markdown/plugins/LocalFile';
import EntityLinkElement from '@/features/EntityLink/element';
import { LocalFile } from '@/features/LocalFile';
import UserAvatar from '@/features/User/UserAvatar';
import { channelActions } from '@/store/channel';
import { useUserStore } from '@/store/user';
import { userProfileSelectors } from '@/store/user/selectors';

import { AuthorAvatar } from './AuthorAvatar';
import { ChannelStatus } from './ChannelStatus';
import { DeferredHoverCard } from './DeferredHoverCard';
import { groupAvatar } from './groupAvatar';
import { callerMemberRole } from './memberManagement';
import { authorAvatar, isCurrentUserAuthor, isCurrentUserMember, memberName } from './memberName';
import { MemberProfilePopup } from './MemberProfilePopup';
import { MemberWorkList } from './memberWork';
import { CHANNEL_MENTION_TAG, remarkChannelMentions } from './mentionMarkdown';
import { MessageAttachments } from './MessageAttachments';
import { MessageEditor } from './MessageEditor';
import { channelMessageTime, channelTimeFormatters, foldsByDefault } from './messagePresentation';
import { MessageRoutingStatus } from './MessageReceipts';
import { RelayLabel } from './RelayLabel';
import { messageReplyError } from './replyError';
import { ReplyErrorCard } from './ReplyErrorCard';
import { showsReplyQuote } from './replyQuote';
import type { ReplyTopic } from './ReplyTopicPanel';
import { ReplyWorks } from './ReplyWorks';
import { styles } from './styles';
import { connectorBox, retainConnectorBox } from './threadConnector';
import type { ChannelThreadDraft } from './threadDraft';
import { threadIcon } from './threadIcon';
import { ThreadPreviewCard } from './ThreadPreviewCard';
import { ThreadRef } from './ThreadRef';
import { CHANNEL_THREAD_REF_TAG, remarkChannelThreadRefs } from './threadRefMarkdown';
import type { ChannelReplyTarget } from './useReplyTarget';

const rehypePlugins = [EntityLinkElement.rehypePlugin];
// Agent replies may recommend another Agent with `<lobeAgents ... />`, rendered as the same card
// the conversation shows. Only Agent-authored text is parsed, matching the element's scope.
const agentRehypePlugins = [...rehypePlugins, LobeAgentsElement.rehypePlugin];
const AGENTS_TAG_REGEX = /<lobeAgents\b[^>]*>/g;
// A tag spread across lines would split into several raw nodes; keep it one node for the plugin.
const joinAgentTags = (content: string) =>
  content.replaceAll(AGENTS_TAG_REGEX, (tag) => tag.replaceAll(/\r?\n|\r/g, ''));
// `<localFile … />` names a file on its author's machine, not the viewer's, so the chip is a
// read-only reference: opening it here would resolve the path against the wrong device.
const ChannelLocalFile = ({ node }: { node?: { properties?: Record<string, unknown> } }) => {
  const { isDirectory, name, path } = node?.properties ?? {};
  return typeof name === 'string' && name ? (
    <LocalFile
      readonly
      isDirectory={isDirectory === true}
      name={name}
      path={typeof path === 'string' ? path : undefined}
    />
  ) : null;
};
const HISTORIC_FOLD_OVERFLOW = 240;
// Matches the `(hover: hover)` query the toolbar's reveal styles use.
const canHover = () =>
  typeof window !== 'undefined' && !!window.matchMedia?.('(hover: hover)').matches;
const AVATAR_SIZE = 36;

/** The gutter line from under a message's avatar to the middle of its thread card. */
const ThreadConnector = ({
  avatarRef,
  cardNode,
  cardRef,
  rowRef,
}: {
  avatarRef: RefObject<HTMLElement | null>;
  /** Changes when the card element mounts, so the effect runs after the ref exists. */
  cardNode: HTMLElement | null;
  cardRef: RefObject<HTMLElement | null>;
  rowRef: RefObject<HTMLElement | null>;
}) => {
  const [box, setBox] = useState<{
    height: number;
    left: number;
    top: number;
    width: number;
  } | null>(null);

  useLayoutEffect(() => {
    let observer: ResizeObserver | null = null;
    let observedFace: Element | null = null;
    let frame = 0;
    let alive = true;

    const measure = () => {
      const row = rowRef.current;
      const card = cardRef.current;
      if (!row || !card || !observer) return;
      // A later message in the same group has no face of its own. Its line still
      // starts under the avatar that heads the group, which sits on an earlier row.
      const face = avatarRef.current ?? groupAvatar(row);
      if (face && face !== observedFace) {
        if (observedFace) observer.unobserve(observedFace);
        observer.observe(face);
        observedFace = face;
      }
      const avatar = face?.getBoundingClientRect() ?? null;
      const next = connectorBox(row.getBoundingClientRect(), card.getBoundingClientRect(), avatar);
      // A zero-size read (the card's ref is attached after this effect, or a resize
      // landed mid-layout) must not erase a line that was already on screen.
      setBox((previous) => retainConnectorBox(previous, next));
    };

    const connect = () => {
      const row = rowRef.current;
      const card = cardRef.current;
      if (!row || !card) return false;
      observer?.disconnect();
      observedFace = null;
      observer = new ResizeObserver(measure);
      observer.observe(row);
      observer.observe(card);
      // An earlier row in the group growing moves this card without resizing it.
      if (row.parentElement) observer.observe(row.parentElement);
      measure();
      return true;
    };

    // This effect runs before the card div, a later sibling, receives its ref.
    if (!connect()) {
      queueMicrotask(() => {
        if (alive) connect();
      });
      frame = requestAnimationFrame(() => {
        if (alive) connect();
      });
    }

    return () => {
      alive = false;
      cancelAnimationFrame(frame);
      observer?.disconnect();
    };
  }, [avatarRef, cardNode, cardRef, rowRef]);

  if (!box) return null;
  return (
    <span
      aria-hidden
      style={{
        height: box.height,
        left: box.left,
        pointerEvents: 'none',
        position: 'absolute',
        top: box.top,
        width: box.width,
        zIndex: 1,
      }}
    >
      <span {...stylex.props(styles.threadSpine)} />
    </span>
  );
};

/**
 * Message text with the members it mentioned shown as chips that show who they are on hover, and
 * `<#cht_…>` thread references as chips that open the thread.
 */
const MessageText = ({
  channelId,
  content,
  fromAgent,
  members,
  onOpenThread,
}: {
  channelId: string;
  content: string;
  fromAgent: boolean;
  members: ChannelPublicMember[];
  /** Kept stable by the timeline, so it can key the memoized component map. */
  onOpenThread?: (threadId: string) => void;
}) => {
  const names = members.map((member) => memberName(member, '')).filter(Boolean);
  const key = names.join('\n');
  // Polling re-renders every message while replies run; a new plugin array or component map
  // would make the memoized Markdown parse each message again on every refresh.
  const remarkPlugins = useMemo(
    () => [
      LocalFileElement.remarkPlugin!,
      remarkChannelMentions(key ? key.split('\n') : []),
      remarkChannelThreadRefs,
    ],
    [key],
  );
  const memberKey = members.map((member) => member.id).join('\n');
  const components = useMemo(
    () => ({
      [CHANNEL_MENTION_TAG]: ({ children, name }: { children?: ReactNode; name?: string }) => {
        const member = members.find((entry) => memberName(entry, '') === name);
        return (
          <MemberProfilePopup member={member}>
            {/* A DOM element, so the popover can attach its hover handlers and anchor ref. */}
            <span {...stylex.props(styles.mention, !!member && styles.mentionHoverable)}>
              {children}
            </span>
          </MemberProfilePopup>
        );
      },
      // The chip resolves the thread's title from the store itself, so polls do not touch this map.
      [CHANNEL_THREAD_REF_TAG]: ({ threadId }: { threadId?: string }) =>
        threadId ? (
          <ThreadRef channelId={channelId} threadId={threadId} onOpenThread={onOpenThread} />
        ) : null,
      // GitHub and LobeHub links render as the same chips the conversation shows.
      [EntityLinkElement.tag]: EntityLinkElement.Component,
      // The card reads only the tag's attributes, not the conversation's message id.
      [LobeAgentsElement.tag]: LobeAgentsElement.Component as FC,
      [LocalFileElement.tag]: ChannelLocalFile,
    }),
    // Keyed by member ids and names: the members array is rebuilt on every poll. The thread
    // handler is a stable event callback.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [memberKey, key, channelId, onOpenThread],
  );
  return (
    <Markdown
      components={components}
      {...stylex.props(styles.messageMarkdown)}
      rehypePlugins={fromAgent ? agentRehypePlugins : rehypePlugins}
      remarkPlugins={remarkPlugins}
    >
      {fromAgent ? joinAgentTags(content) : content}
    </Markdown>
  );
};

const ChannelMessageView = ({
  delivery,
  detail,
  continuation = false,
  message,
  isRoot,
  highlighted,
  threadId,
  onOpenThread,
  onStartThread,
  onReply,
  onJumpToMessage,
  onOpenTopic,
  pending = false,
}: {
  continuation?: boolean;
  /** For a message the server has not confirmed: its send status, in place of routing. */
  delivery?: ReactNode;
  detail: ChannelDetail;
  isRoot?: boolean;
  highlighted?: boolean;
  message: ChannelPublicMessage;
  onOpenThread?: (threadId: string) => void;
  onStartThread?: (draft: ChannelThreadDraft) => void;
  onReply?: (message: ChannelPublicMessage) => void;
  onJumpToMessage?: (message: ChannelReplyTarget) => void;
  /** Opens the Agent topic a reply came from; offered only when the server shares it. */
  onOpenTopic?: (topic: ReplyTopic) => void;
  /** Sent from this tab and not yet confirmed by the server. */
  pending?: boolean;
  threadId?: string | null;
}) => {
  const { t, i18n } = useTranslation('channel');
  const rowRef = useRef<HTMLDivElement>(null);
  const avatarRef = useRef<HTMLSpanElement>(null);
  const cardRef = useRef<HTMLElement>(null);
  // The connector's layout effect runs before this ref is attached. Publishing the
  // node makes that effect run again once the card is actually in the document.
  const [cardNode, setCardNode] = useState<HTMLElement | null>(null);
  const setCardRef = useCallback((node: HTMLElement | null) => {
    cardRef.current = node;
    setCardNode((current) => (current === node ? current : node));
  }, []);
  const timeFormats = channelTimeFormatters(i18n.language);
  const date = new Date(message.createdAt);
  // Failed/unassigned requests keep their identity row and recovery affordance.
  // A relayed message keeps its header, so the relay label beside the time stays visible.
  const compact =
    continuation &&
    !isRoot &&
    !message.via &&
    message.routingStatus !== 'unassigned' &&
    !detail.jobs.some((job) => job.messageId === message.id && job.status === 'failed');
  // A continuation sits under its header, so its hover stamp only needs the clock.
  const timestamp = (
    <time
      dateTime={date.toISOString()}
      title={timeFormats.full.format(date)}
      {...stylex.props(styles.messageTime)}
    >
      {compact
        ? timeFormats.time.format(date)
        : channelMessageTime(date, { locale: i18n.language, yesterday: t('date.yesterday') })}
    </time>
  );
  const isOwnMessage = useUserStore((s) =>
    isCurrentUserAuthor(message.author, userProfileSelectors.userId(s)),
  );
  const isAdmin = useUserStore((s) => {
    const role = callerMemberRole(detail.members, userProfileSelectors.userId(s));
    return role === 'owner' || role === 'admin';
  });
  const deleted = !!message.deletedAt;
  // Someone else's message that @-mentions you stands out in the feed, the way Slack marks it.
  const mentionsMe = useUserStore((s) => {
    const userId = userProfileSelectors.userId(s);
    return (
      !isCurrentUserAuthor(message.author, userId) &&
      detail.members.some(
        (member) => message.mentions.includes(member.id) && isCurrentUserMember(member, userId),
      )
    );
  });
  // Inside a thread, its root and replies link nowhere else.
  const thread =
    !threadId && !isRoot && detail.threads.find((entry) => entry.rootMessageId === message.id);
  const canBranch = !threadId && !isRoot && !thread && !!onStartThread;
  const startThread = () =>
    onStartThread?.({
      root: message,
      attachments: detail.attachments.filter((file) => message.fileIds.includes(file.id)),
    });
  const isRequest = message.author.type === 'user' && !isRoot;
  const agentAuthorId = message.author.type === 'agent' ? message.author.id : null;
  const userMember =
    message.author.type === 'user' && message.author.id
      ? detail.members.find(
          (member) => member.actorType === 'user' && member.userId === message.author.id,
        )
      : undefined;
  const agentMember = agentAuthorId
    ? detail.members.find((member) => member.agentId === agentAuthorId)
    : undefined;
  const sourceTopicId = message.sourceTopicId;
  // A long message from before yesterday folds by default so scrolling back stays quick; a
  // recent one stays open and folding it is an explicit choice from "more".
  const [historic] = useState(() => foldsByDefault(date));
  // A direct conversation is a chat with one Agent; folding its recent answers only adds a click.
  const collapsible = historic || !detail.channel.agentId;
  const [collapsed, setCollapsed] = useState(historic);
  const [overflowing, setOverflowing] = useState(false);
  const [editing, setEditing] = useState(false);
  // The toolbar only shows on hover, yet its tooltips and menu are a real share of a message's
  // render; mount it when the row is first pointed at or focused, and keep it so an open menu
  // survives the pointer leaving. Without hover (touch) it is always visible, so mount it upfront.
  const [toolbarMounted, setToolbarMounted] = useState(() => !canHover());
  const mountToolbar = () => setToolbarMounted(true);
  // A shared contact card renders as the card; its text is only the server's fallback.
  const card = deleted ? undefined : contactCardOf(message.card);
  // Only a person's own sent message; one still sending has nothing on the server to edit yet.
  // A card's text is not something its sender wrote, so there is nothing to edit.
  const canEdit =
    !deleted && !card && isOwnMessage && message.author.type === 'user' && !pending && !delivery;
  // A person deletes their own message; an admin any, Agent replies included.
  const canDelete =
    !deleted &&
    !pending &&
    !delivery &&
    ((isOwnMessage && message.author.type === 'user') || isAdmin);
  const confirmDelete = () =>
    confirmModal({
      cancelText: t('cancel'),
      content: t('message.deleteConfirm'),
      okButtonProps: { danger: true },
      okText: t('message.delete'),
      title: t('message.delete'),
      onOk: async () => {
        try {
          await channelActions.deleteMessage(detail.channel.id, message.id);
        } catch (error) {
          console.error('[channel] Failed to delete a message', error);
          toast.error(t('message.deleteFailed'));
          throw error;
        }
      },
    });
  const moreItems = [
    ...(canEdit
      ? [
          {
            icon: PencilLine,
            key: 'edit',
            label: t('message.edit'),
            onClick: () => setEditing(true),
          },
        ]
      : []),
    ...(agentAuthorId && sourceTopicId && onOpenTopic
      ? [
          {
            icon: MessagesSquare,
            key: 'openTopic',
            label: t('topic.open'),
            onClick: () =>
              onOpenTopic({
                agentId: agentAuthorId,
                avatar: message.author.avatar,
                name: message.author.name || t('unnamedAgent'),
                title: message.sourceTopicTitle,
                topicId: sourceTopicId,
              }),
          },
        ]
      : []),
    ...(message.content
      ? [
          {
            icon: Copy,
            key: 'copy',
            label: t('message.copy'),
            onClick: async () => {
              await copyToClipboard(message.content);
              toast.success(t('message.copied'));
            },
          },
        ]
      : []),
    ...(collapsible && overflowing
      ? [
          {
            icon: collapsed ? ChevronsUpDown : ChevronsDownUp,
            key: 'toggleCollapse',
            label: t(collapsed ? 'message.expand' : 'message.collapse'),
            onClick: () => setCollapsed(!collapsed),
          },
        ]
      : []),
    ...(canDelete
      ? [
          { type: 'divider' as const },
          {
            danger: true,
            icon: Trash2,
            key: 'delete',
            label: t('message.delete'),
            onClick: confirmDelete,
          },
        ]
      : []),
  ];
  // A deleted message keeps only its place (and its Thread card); there is nothing to act on.
  const hasToolbar = !editing && !deleted && (!!onReply || canBranch || moreItems.length > 0);
  const mentionedMembers = detail.members.filter((member) => message.mentions.includes(member.id));
  const quoted = message.replyTo;
  const quoteAuthor = quoted && !quoted.deletedAt ? quoted.author : null;
  const replyQuoteText = !quoted
    ? t('reply.unavailable')
    : quoted.deletedAt
      ? t('reply.deleted')
      : `${quoteAuthor?.name || t('deletedMember')}: ${(localizeCardFallback(quoted.content) || t('reply.attachment')).replaceAll(/\s+/g, ' ').trim()}`;
  const replyQuote = !isRoot && showsReplyQuote(message) && (
    <button
      aria-label={t('reply.viewOriginal')}
      disabled={!quoted}
      type="button"
      {...stylex.props(styles.replyQuote, compact && styles.replyQuoteCompact)}
      onClick={() => quoted && onJumpToMessage?.(quoted)}
    >
      {quoteAuthor && (
        <span {...stylex.props(styles.replyQuoteFace)}>
          <AuthorAvatar author={quoteAuthor} size={16} />
        </span>
      )}
      <span {...stylex.props(styles.replyQuoteText)}>{replyQuoteText}</span>
    </button>
  );
  const attachments = message.fileIds.length > 0 && (
    <MessageAttachments attachments={detail.attachments} fileIds={message.fileIds} />
  );
  const text = message.content && (
    <MessageText
      channelId={detail.channel.id}
      content={message.content}
      fromAgent={message.author.type === 'agent'}
      members={mentionedMembers}
      onOpenThread={onOpenThread}
    />
  );
  // A reply that failed for a system reason, posted by the server where the reply would be.
  const replyError = !deleted && messageReplyError(message);
  const content = deleted ? (
    <Text italic type="secondary">
      {t('message.deleted')}
    </Text>
  ) : replyError ? (
    <ReplyErrorCard detail={detail} message={message} replyError={replyError} />
  ) : card ? (
    <ContactCardMessage card={card} />
  ) : (
    message.content &&
    (collapsible ? (
      <CollapsibleContent
        hideCollapseToggle
        collapsed={collapsed}
        fade={false}
        key={message.id}
        maxHeight={160}
        // Folding unasked is only worth it for a really long message.
        overflowThreshold={historic ? HISTORIC_FOLD_OVERFLOW : undefined}
        onCollapsedChange={setCollapsed}
        onOverflowChange={setOverflowing}
      >
        {text}
      </CollapsibleContent>
    ) : (
      text
    ))
  );
  const editor = editing && (
    <MessageEditor
      allowEmpty={message.fileIds.length > 0}
      content={message.content}
      onCancel={() => setEditing(false)}
      onSave={(content) => channelActions.editMessage(detail.channel.id, message.id, content)}
    />
  );
  const edited = message.editedAt && !editing && (
    <time
      dateTime={new Date(message.editedAt).toISOString()}
      title={timeFormats.full.format(new Date(message.editedAt))}
      {...stylex.props(styles.messageEdited)}
    >
      {t('message.edited')}
    </time>
  );
  const threadCard = thread && (
    <ThreadPreviewCard
      anchorRef={setCardRef}
      detail={detail}
      root={message}
      thread={thread}
      onOpen={() => onOpenThread?.(thread.id)}
    />
  );
  const below = delivery ?? (isRequest ? <MessageRoutingStatus message={message} /> : undefined);
  const headerMarks = (
    <>
      <RelayLabel message={message} />
      {replyError && <ChannelStatus label={t('status.failed')} tone="error" />}
    </>
  );
  const toolbar = hasToolbar && toolbarMounted && (
    // Icon-only, like a chat app's hover toolbar; rarer actions sit behind "more".
    <div {...stylex.props(styles.messageToolbar)}>
      {onReply && (
        <ActionIcon
          aria-label={t('reply.action')}
          icon={Reply}
          size="small"
          title={t('reply.action')}
          onClick={() => onReply(message)}
        />
      )}
      {canBranch && (
        <ActionIcon
          aria-label={t('startThread')}
          icon={threadIcon}
          size="small"
          title={t('startThread')}
          onClick={startThread}
        />
      )}
      {moreItems.length > 0 && (
        <DropdownMenu items={moreItems}>
          <ActionIcon
            aria-label={t('more', { ns: 'common' })}
            icon={MoreHorizontal}
            size="small"
            title={t('more', { ns: 'common' })}
          />
        </DropdownMenu>
      )}
    </div>
  );
  const rowProps = {
    'aria-busy': pending || undefined,
    'aria-label': message.author.name || t('deletedMember'),
    'data-continuation': compact || undefined,
    'data-message-id': message.id,
    'role': 'article',
  };

  // Everyone on the left under avatar and name, Discord-style: easy to scan in a busy feed.
  return (
    <div
      {...rowProps}
      ref={rowRef}
      onFocus={toolbarMounted ? undefined : mountToolbar}
      onPointerEnter={toolbarMounted ? undefined : mountToolbar}
      {...stylex.props(
        styles.messageRow,
        !compact && styles.groupStart,
        mentionsMe && styles.mentionedMessage,
        highlighted && styles.highlightedMessage,
        pending && styles.pendingMessage,
        stylex.defaultMarker(),
      )}
    >
      {replyQuote}
      {compact && <span {...stylex.props(styles.continuationTime)}>{timestamp}</span>}
      <ChatItem
        quietHeader
        showAvatar
        showTitle
        agentId={agentAuthorId ?? undefined}
        avatarProps={{ shape: 'circle', size: AVATAR_SIZE }}
        belowMessage={below}
        gap={2}
        id={message.id}
        paddingBlock={compact ? 2 : 8}
        placement="left"
        showHeader={!compact}
        // The space between authors sits above a group (groupStart); a message keeps 2px below.
        style={{ paddingBlockEnd: 2, paddingInlineStart: 48 }}
        avatar={{
          avatar: authorAvatar(message.author),
          title: message.author.name || t('deletedMember'),
        }}
        customAvatarRender={(_, avatar) => (
          <span data-message-avatar="" ref={avatarRef} {...stylex.props(styles.messageAvatar)}>
            {!agentAuthorId ? (
              <MemberProfilePopup member={userMember} trigger={'click'}>
                <span
                  {...stylex.props(
                    styles.messageAvatarInline,
                    !!userMember && styles.messageAvatarHoverable,
                  )}
                >
                  {isOwnMessage ? (
                    <UserAvatar shape={'circle'} size={AVATAR_SIZE} />
                  ) : message.author.type === 'user' ? (
                    // Without an image, the pixel avatar generated from the name: the face the
                    // message list shows for this person.
                    <PersonAvatar
                      avatar={message.author.avatar}
                      name={message.author.name || t('deletedMember')}
                      shape={'circle'}
                      size={AVATAR_SIZE}
                    />
                  ) : (
                    avatar
                  )}
                </span>
              </MemberProfilePopup>
            ) : (
              <DeferredHoverCard
                openOn={'click'}
                render={(trigger, control) => (
                  <AgentProfilePopup
                    agentId={agentAuthorId}
                    environment={agentMember?.environment}
                    open={control?.open}
                    trigger={'click'}
                    agent={{
                      avatar: message.author.avatar,
                      description: agentMember?.description,
                      title: message.author.name,
                    }}
                    extra={
                      <MemberWorkList
                        detail={detail}
                        member={agentMember}
                        onOpenThread={onOpenThread}
                      />
                    }
                    onOpenChange={control?.onOpenChange}
                  >
                    {trigger}
                  </AgentProfilePopup>
                )}
              >
                <span {...stylex.props(styles.messageAvatarHoverable)}>
                  <AgentAvatar
                    agentId={agentAuthorId}
                    avatar={message.author.avatar}
                    name={message.author.name}
                    shape={'circle'}
                    size={AVATAR_SIZE}
                  />
                </span>
              </DeferredHoverCard>
            )}
          </span>
        )}
        message={
          <Flexbox gap={8}>
            {attachments}
            {editing ? editor : content}
            {edited}
            {!!message.works?.length && <ReplyWorks works={message.works} />}
            {threadCard}
          </Flexbox>
        }
        titleAddon={
          <>
            {timestamp}
            {headerMarks}
          </>
        }
      />
      {thread && (
        <ThreadConnector
          avatarRef={avatarRef}
          cardNode={cardNode}
          cardRef={cardRef}
          rowRef={rowRef}
        />
      )}
      {toolbar}
    </div>
  );
};

/**
 * The feed renders every message, so opening a thread or any other page-level change would
 * redraw all of them; with stable props from the conversation, only the changed ones redraw.
 */
export const ChannelMessage = memo(ChannelMessageView);

export function ThreadRootMessage({
  detail,
  root,
  onReply,
  highlighted,
}: {
  detail: ChannelDetail;
  root: ChannelPublicMessage;
  onReply?: (message: ChannelPublicMessage) => void;
  highlighted?: boolean;
}) {
  const { t } = useTranslation('channel');
  return (
    <Flexbox>
      <ChannelMessage
        isRoot
        detail={detail}
        highlighted={highlighted}
        message={root}
        onReply={onReply}
      />
      <Divider>
        <Flexbox horizontal align="center" gap={6} {...stylex.props(styles.muted)}>
          <Icon icon={threadIcon} size={12} />
          {t('threadDivider')}
        </Flexbox>
      </Divider>
    </Flexbox>
  );
}
