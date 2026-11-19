import { ActionIcon, Icon, Popover, SearchBar, Select } from '@lobehub/ui';
import { cssVar } from '@lobehub/ui/stylex/cssVar.stylex';
import type { ChannelDetail, ChannelPublicThread } from '@lobot/types';
import * as stylex from '@stylexjs/stylex';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { useCloseOnNavigate } from '@/hooks/useCloseOnNavigate';
import { channelSelectors, useChannelStore } from '@/store/channel';
import { markdownToTxt } from '@/utils/markdownToTxt';

import { AuthorAvatar } from './AuthorAvatar';
import { MemberAvatar } from './MemberAvatar';
import { threadIcon } from './threadIcon';
import { useMentionedThreadIds, useUnreadThreadIds } from './threadReads';
import { threadTitle } from './threadTitle';

dayjs.extend(relativeTime);

const MAX_FACES = 3;
const FACE_SIZE = 24;

const styles = stylex.create({
  panel: {
    display: 'flex',
    flexDirection: 'column',
    width: 440,
    maxWidth: 'calc(100vw - 48px)',
    maxHeight: 'min(560px, calc(100vh - 120px))',
    color: cssVar.colorText,
  },
  header: {
    display: 'flex',
    flexShrink: 0,
    gap: 10,
    alignItems: 'center',
    paddingBlockEnd: 10,
    borderBlockEndWidth: 1,
    borderBlockEndStyle: 'solid',
    borderBlockEndColor: cssVar.colorBorderSecondary,
  },
  heading: {
    display: 'inline-flex',
    flexShrink: 0,
    gap: 6,
    alignItems: 'center',
    fontSize: 14,
    fontWeight: 600,
  },
  search: { flex: '1', minWidth: 0 },
  count: {
    display: 'flex',
    flexShrink: 0,
    gap: 8,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBlock: 10,
    fontSize: 12,
    fontWeight: 500,
    color: cssVar.colorTextSecondary,
  },
  list: {
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    minHeight: 0,
  },
  countLabel: { whiteSpace: 'nowrap' },
  empty: {
    paddingBlock: 24,
    fontSize: 13,
    color: cssVar.colorTextTertiary,
    textAlign: 'center',
  },
  card: {
    display: 'flex',
    gap: 12,
    alignItems: 'center',
    width: '100%',
    paddingBlock: 10,
    paddingInline: 12,
    borderWidth: 0,
    borderRadius: cssVar.borderRadiusLG,
    font: 'inherit',
    textAlign: 'start',
    color: 'inherit',
    backgroundColor: {
      'default': cssVar.colorFillQuaternary,
      ':hover': cssVar.colorFillTertiary,
    },
    cursor: 'pointer',
  },
  // Like Discord, the open thread is only a shade brighter, with no outline.
  active: {
    backgroundColor: cssVar.colorFillSecondary,
  },
  // Archived threads fade back, and come forward again under the pointer.
  archived: {
    opacity: { 'default': 0.55, ':hover': 1 },
    backgroundColor: { 'default': 'transparent', ':hover': cssVar.colorFillTertiary },
  },
  group: {
    paddingBlockStart: 10,
    paddingBlockEnd: 2,
    paddingInline: 4,
    fontSize: 12,
    fontWeight: 500,
    color: cssVar.colorTextTertiary,
  },
  body: {
    display: 'flex',
    flex: '1',
    flexDirection: 'column',
    gap: 4,
    minWidth: 0,
  },
  titleRow: {
    display: 'flex',
    gap: 6,
    alignItems: 'center',
    minWidth: 0,
  },
  title: {
    overflow: 'hidden',
    minWidth: 0,
    fontSize: 14,
    fontWeight: 500,
    color: cssVar.colorTextSecondary,
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  // Unread reads like Discord: the title turns bright and bold, with a red dot ahead of it.
  unreadTitle: {
    fontWeight: 600,
    color: cssVar.colorText,
  },
  // Discord's mention pill: someone @mentioned the person in this thread since they last looked.
  mention: {
    display: 'inline-flex',
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 18,
    height: 16,
    marginInlineStart: 'auto',
    paddingInline: 4,
    borderRadius: 8,
    fontSize: 11,
    fontWeight: 700,
    lineHeight: 1,
    color: cssVar.colorTextLightSolid,
    backgroundColor: cssVar.colorError,
  },
  dot: {
    display: 'inline-block',
    flexShrink: 0,
    width: 8,
    height: 8,
    borderRadius: '50%',
    backgroundColor: cssVar.colorError,
  },
  reply: {
    display: 'flex',
    gap: 6,
    alignItems: 'center',
    minWidth: 0,
    fontSize: 12,
    color: cssVar.colorTextTertiary,
  },
  author: {
    flexShrink: 0,
    fontWeight: 600,
    color: cssVar.colorTextSecondary,
  },
  preview: {
    overflow: 'hidden',
    minWidth: 0,
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  time: { flexShrink: 0, whiteSpace: 'nowrap' },
  faces: {
    display: 'inline-flex',
    flexShrink: 0,
    alignItems: 'center',
  },
  // Overlapping faces, each ringed so the edges stay apart.
  face: {
    display: 'inline-flex',
    marginInlineStart: -6,
    borderRadius: '50%',
    boxShadow: `0 0 0 2px ${cssVar.colorBgElevated}`,
  },
  firstFace: { marginInlineStart: 0 },
  trigger: {
    position: 'relative',
    display: 'inline-flex',
  },
  // Sits on the button's top-right corner without taking part in the header's layout.
  triggerBadge: {
    pointerEvents: 'none',
    position: 'absolute',
    insetBlockStart: -1,
    insetInlineEnd: -3,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 12,
    height: 12,
    paddingInline: 3,
    borderRadius: 999,
    fontSize: 8,
    fontWeight: 600,
    lineHeight: 1,
    color: cssVar.colorTextLightSolid,
    backgroundColor: cssVar.colorError,
    boxShadow: `0 0 0 1.5px ${cssVar.colorBgLayout}`,
  },
});

const oneLine = (text: string) => text.replaceAll(/\s+/g, ' ').trim();

const time = (value?: Date | string | null) => (value ? new Date(value).getTime() : 0);

/** How the panel orders threads: by their newest reply, or by when they were opened. */
export type ThreadSort = 'activity' | 'created';

const sortKey = (thread: ChannelPublicThread, sort: ThreadSort) =>
  sort === 'created'
    ? time(thread.createdAt)
    : time(thread.lastReply?.createdAt) || time(thread.createdAt);

/** The person's chosen thread order, kept on this device across Channels. */
const useThreadSortStore = create<{ sort: ThreadSort }>()(
  persist(() => ({ sort: 'activity' as ThreadSort }), {
    name: 'LOBE_CHANNEL_THREAD_SORT',
    storage: createJSONStorage(() => localStorage),
  }),
);

export interface BrowsedThread {
  active: boolean;
  archived: boolean;
  mentioned: boolean;
  preview?: string;
  thread: ChannelPublicThread;
  title: string;
  unread: boolean;
}

/**
 * The Channel's threads as the panel lists them: live ones first, then the archived ones, each
 * newest first by the chosen order, filtered by a search on the title and the last reply.
 */
export const browseThreads = (
  detail: Pick<ChannelDetail, 'messages' | 'threads'>,
  {
    activeId,
    fallbackTitle,
    mentionedIds = new Set(),
    query,
    sort = 'activity',
    unreadIds,
  }: {
    activeId: string | null;
    fallbackTitle: (index: number) => string;
    mentionedIds?: Set<string>;
    query: string;
    sort?: ThreadSort;
    unreadIds: Set<string>;
  },
): BrowsedThread[] => {
  const needle = query.trim().toLowerCase();
  return detail.threads
    .map((thread, index) => ({ index, thread }))
    .map(({ thread, index }) => {
      const title =
        threadTitle(
          detail.messages.find((message) => message.id === thread.rootMessageId),
          thread,
        ) || fallbackTitle(index);
      const preview = thread.lastReply
        ? oneLine(markdownToTxt(thread.lastReply.content))
        : undefined;
      const active = thread.id === activeId;
      const archived = thread.status === 'archived';
      // The open thread is being read, and an archived one takes no new replies, so neither
      // counts as unread.
      const unread = !active && !archived && unreadIds.has(thread.id);
      const mentioned = !active && !archived && mentionedIds.has(thread.id);
      return { active, archived, mentioned, preview, thread, title, unread };
    })
    .filter(
      ({ preview, title }) =>
        !needle ||
        title.toLowerCase().includes(needle) ||
        !!preview?.toLowerCase().includes(needle),
    )
    .sort(
      (a, b) =>
        Number(a.archived) - Number(b.archived) ||
        sortKey(b.thread, sort) - sortKey(a.thread, sort),
    );
};

export const ThreadCard = ({
  detail,
  entry,
  onOpen,
  showFaces = true,
}: {
  detail: ChannelDetail;
  entry: BrowsedThread;
  onOpen: () => void;
  /** Follower faces at the end of the card. Off where the card is already inside a person's profile. */
  showFaces?: boolean;
}) => {
  const { t } = useTranslation('channel');
  const { active, archived, mentioned, preview, thread, title, unread } = entry;
  // A mention is unread news even when the reply after it was read elsewhere.
  const bright = unread || mentioned;
  const faces = showFaces
    ? thread.followerMemberIds
        .map((id) =>
          detail.members.find((member) => member.id === id && member.status === 'active'),
        )
        .filter((member) => !!member)
        .slice(0, MAX_FACES)
    : [];
  const { lastReply } = thread;
  return (
    <button
      aria-current={active || undefined}
      type="button"
      {...stylex.props(styles.card, archived && styles.archived, active && styles.active)}
      onClick={onOpen}
    >
      <span {...stylex.props(styles.body)}>
        <span {...stylex.props(styles.titleRow)}>
          {bright && (
            <span aria-label={t('threadUnread')} role="img" {...stylex.props(styles.dot)} />
          )}
          <span title={title} {...stylex.props(styles.title, bright && styles.unreadTitle)}>
            {title}
          </span>
          {mentioned && (
            <span aria-label={t('threadMentioned')} role="img" {...stylex.props(styles.mention)}>
              @
            </span>
          )}
        </span>
        {lastReply && (
          <span {...stylex.props(styles.reply)}>
            <AuthorAvatar author={lastReply.author} size={16} />
            {lastReply.author.name && (
              <span {...stylex.props(styles.author)}>{lastReply.author.name}:</span>
            )}
            <span {...stylex.props(styles.preview)}>{preview}</span>
            <span aria-hidden>·</span>
            <time
              dateTime={new Date(lastReply.createdAt).toISOString()}
              {...stylex.props(styles.time)}
            >
              {dayjs(lastReply.createdAt).fromNow()}
            </time>
          </span>
        )}
      </span>
      {faces.length > 0 && (
        <span {...stylex.props(styles.faces)}>
          {faces.map((member, index) => (
            <span key={member.id} {...stylex.props(styles.face, index === 0 && styles.firstFace)}>
              <MemberAvatar member={member} size={FACE_SIZE} />
            </span>
          ))}
        </span>
      )}
    </button>
  );
};

/** The panel behind the header's threads button: search, a count, then one card per thread. */
export const ThreadBrowser = ({
  activeId,
  detail,
  onOpen,
}: {
  activeId: string | null;
  detail: ChannelDetail;
  onOpen: (threadId: string) => void;
}) => {
  const { t } = useTranslation('channel');
  const [query, setQuery] = useState('');
  const sort = useThreadSortStore((state) => state.sort);
  const unreadIds = useUnreadThreadIds(detail.threads, detail.members);
  const mentionedIds = useMentionedThreadIds(
    useChannelStore(channelSelectors.listed(detail.channel.id))?.threadMentions,
  );
  const entries = browseThreads(detail, {
    activeId,
    fallbackTitle: (index) => `${t('thread')} ${index + 1}`,
    mentionedIds,
    query,
    sort,
    unreadIds,
  });
  const archivedCount = entries.filter((entry) => entry.archived).length;
  const renderCard = (entry: BrowsedThread) => (
    <ThreadCard
      detail={detail}
      entry={entry}
      key={entry.thread.id}
      onOpen={() => {
        if (!entry.active) onOpen(entry.thread.id);
      }}
    />
  );
  return (
    <div {...stylex.props(styles.panel)}>
      <div {...stylex.props(styles.header)}>
        <span {...stylex.props(styles.heading)}>
          <Icon icon={threadIcon} size={18} />
          {t('threadList')}
        </span>
        <div {...stylex.props(styles.search)}>
          <SearchBar
            allowClear
            autoFocus
            placeholder={t('threadBrowser.search')}
            value={query}
            variant="filled"
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
      </div>
      <div {...stylex.props(styles.count)}>
        <span {...stylex.props(styles.countLabel)}>
          {query.trim()
            ? t('threadBrowser.matches', { count: entries.length })
            : t('threadBrowser.count', { count: entries.length })}
        </span>
        <Select
          aria-label={t('threadBrowser.sort')}
          popupMatchSelectWidth={false}
          size="small"
          style={{ flex: 'none', width: 112 }}
          variant="borderless"
          // Sized to its longest option so it sits at the row's end instead of stretching across
          // it; inline so it wins over the trigger's own full width.
          value={sort}
          options={[
            { label: t('threadBrowser.sortActivity'), value: 'activity' },
            { label: t('threadBrowser.sortCreated'), value: 'created' },
          ]}
          onChange={(value) => {
            if (value === 'activity' || value === 'created')
              useThreadSortStore.setState({ sort: value });
          }}
        />
      </div>
      <div {...stylex.props(styles.list)}>
        {entries.length ? (
          <>
            {entries.filter((entry) => !entry.archived).map(renderCard)}
            {archivedCount > 0 && (
              <>
                <div {...stylex.props(styles.group)}>
                  {t('archivedGroup', { count: archivedCount })}
                </div>
                {entries.filter((entry) => entry.archived).map(renderCard)}
              </>
            )}
          </>
        ) : (
          <div {...stylex.props(styles.empty)}>{t('threadBrowser.empty')}</div>
        )}
      </div>
    </div>
  );
};

/**
 * The header's threads button. A count badge on it says how many threads other than the open one
 * have replies the person has not seen; a click opens the thread panel.
 */
export const ThreadsButton = ({
  activeId,
  detail,
  onOpen,
}: {
  activeId: string | null;
  detail: ChannelDetail;
  onOpen: (threadId: string) => void;
}) => {
  const { t } = useTranslation('channel');
  const [open, setOpen] = useState(false);
  const popoverKey = useCloseOnNavigate(open, () => setOpen(false));
  const unreadIds = useUnreadThreadIds(detail.threads, detail.members);
  const mentionedIds = useMentionedThreadIds(
    useChannelStore(channelSelectors.listed(detail.channel.id))?.threadMentions,
  );
  if (!detail.threads.length) return null;
  const unread = detail.threads.filter(
    (thread) =>
      thread.status !== 'archived' &&
      thread.id !== activeId &&
      (unreadIds.has(thread.id) || mentionedIds.has(thread.id)),
  ).length;
  const label = unread ? t('threadListUnread', { count: unread }) : t('threadList');
  return (
    <Popover
      key={popoverKey}
      open={open}
      placement="bottomRight"
      trigger="click"
      content={
        <ThreadBrowser
          activeId={activeId}
          detail={detail}
          onOpen={(threadId) => {
            setOpen(false);
            onOpen(threadId);
          }}
        />
      }
      onOpenChange={setOpen}
    >
      <span {...stylex.props(styles.trigger)}>
        <ActionIcon active={open} aria-label={label} icon={threadIcon} size="small" title={label} />
        {unread > 0 && (
          <span aria-hidden {...stylex.props(styles.triggerBadge)}>
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </span>
    </Popover>
  );
};
