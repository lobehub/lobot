import type { ChannelDetail, ChannelPublicMember, ChannelPublicThread } from '@lobot/types';
import { type DropdownItem, DropdownMenu, Icon } from '@lobehub/ui';
import { cssVar } from '@lobehub/ui/stylex/cssVar.stylex';
import * as stylex from '@stylexjs/stylex';
import { Check } from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { MemberAvatar } from './MemberAvatar';
import { useUnreadThreadIds } from './threadReads';
import { threadTitle } from './threadTitle';

const AVATAR_SIZE = 20;

const styles = stylex.create({
  row: {
    display: 'flex',
    gap: 8,
    alignItems: 'center',
  },
  avatar: {
    display: 'flex',
    flexShrink: 0,
    width: AVATAR_SIZE,
  },
  // A title can be a whole first line; the menu stays narrow and the full title shows on hover.
  label: {
    overflow: 'hidden',
    display: 'block',
    maxWidth: 320,
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  // An unread thread's title is one step brighter, as an unread Channel's is in the sidebar.
  unreadLabel: {
    color: cssVar.colorText,
    fontWeight: 500,
  },
  // An empty span is inline by default, where width and height do nothing.
  dot: {
    display: 'inline-block',
    flexShrink: 0,
    width: 8,
    height: 8,
    borderRadius: '50%',
    backgroundColor: cssVar.colorError,
  },
});

/** Who a thread belongs to: its first Agent still in the Channel, else its first person. */
export const threadOwner = (
  thread: Pick<ChannelPublicThread, 'followerMemberIds'>,
  members: ChannelPublicMember[] = [],
): ChannelPublicMember | undefined => {
  const followers = (thread.followerMemberIds ?? [])
    .map((id) => members.find((member) => member.id === id && member.status === 'active'))
    .filter((member): member is ChannelPublicMember => !!member);
  return followers.find((member) => member.actorType === 'agent') ?? followers[0];
};

/**
 * The Channel's threads as menu items, the open one checked and unread ones marked with a red dot.
 * Archived threads stay out, as in the sidebar, unless one of them is open. Plain items, not
 * checkbox ones: a checkbox item keeps an empty check column ahead of the avatar on every row, so
 * the check sits on the right instead.
 */
const useThreadItems = (
  detail: ChannelDetail,
  activeId: string | null,
  onOpen: (threadId: string) => void,
): DropdownItem[] => {
  const { t } = useTranslation('channel');
  const unreadIds = useUnreadThreadIds(detail.threads);
  const listed = detail.threads
    .map((thread, index) => ({ index, thread }))
    .filter(({ thread }) => thread.status !== 'archived' || thread.id === activeId);
  // The open thread is being read, so it never counts.
  const isUnread = (threadId: string) => threadId !== activeId && unreadIds.has(threadId);
  const items = listed.map(({ thread, index }): DropdownItem => {
    const title =
      threadTitle(
        detail.messages.find((message) => message.id === thread.rootMessageId),
        thread,
      ) || `${t('thread')} ${index + 1}`;
    const owner = threadOwner(thread, detail.members);
    const active = thread.id === activeId;
    const unread = isUnread(thread.id);
    return {
      // Picking a thread navigates, so the menu goes away like any other navigation.
      closeOnClick: true,
      extra: active ? (
        <Icon icon={Check} size={14} />
      ) : unread ? (
        <span aria-label={t('threadUnread')} role="img" {...stylex.props(styles.dot)} />
      ) : undefined,
      key: thread.id,
      label: (
        <span {...stylex.props(styles.row)}>
          {/* An empty slot when nobody follows the thread keeps every title on one line. */}
          <span {...stylex.props(styles.avatar)}>
            {owner && <MemberAvatar member={owner} size={AVATAR_SIZE} />}
          </span>
          <span title={title} {...stylex.props(styles.label, unread && styles.unreadLabel)}>
            {title}
          </span>
        </span>
      ),
      onClick: () => {
        if (!active) onOpen(thread.id);
      },
    };
  });
  return items;
};

/** Wraps the open thread's title so it switches to another thread of the Channel. */
export const ThreadSwitchMenu = ({
  children,
  detail,
  onOpen,
  threadId,
}: {
  children: ReactNode;
  detail: ChannelDetail;
  onOpen: (threadId: string) => void;
  threadId: string;
}) => {
  const items = useThreadItems(detail, threadId, onOpen);
  return (
    <DropdownMenu items={items} placement="bottomLeft">
      {children}
    </DropdownMenu>
  );
};
