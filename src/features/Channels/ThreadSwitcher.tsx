import type { ChannelDetail, ChannelPublicMember, ChannelPublicThread } from '@lobechat/types';
import { ActionIcon, type DropdownItem, DropdownMenu, Icon } from '@lobehub/ui';
import * as stylex from '@stylexjs/stylex';
import { Check, MessagesCircle } from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { MemberAvatar } from './MemberAvatar';
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
 * The Channel's threads as menu items, the open one checked. Archived threads stay out, as in
 * the sidebar, unless one of them is open. Plain items, not checkbox ones: a checkbox item keeps
 * an empty check column ahead of the avatar on every row, so the check sits on the right instead.
 */
const useThreadItems = (
  detail: ChannelDetail,
  activeId: string | null,
  onOpen: (threadId: string) => void,
): DropdownItem[] => {
  const { t } = useTranslation('channel');
  return detail.threads
    .map((thread, index) => ({ index, thread }))
    .filter(({ thread }) => thread.status !== 'archived' || thread.id === activeId)
    .map(({ thread, index }) => {
      const title =
        threadTitle(
          detail.messages.find((message) => message.id === thread.rootMessageId),
          thread,
        ) || `${t('thread')} ${index + 1}`;
      const owner = threadOwner(thread, detail.members);
      const active = thread.id === activeId;
      return {
        // Picking a thread navigates, so the menu goes away like any other navigation.
        closeOnClick: true,
        extra: active ? <Icon icon={Check} size={14} /> : undefined,
        key: thread.id,
        label: (
          <span {...stylex.props(styles.row)}>
            {/* An empty slot when nobody follows the thread keeps every title on one line. */}
            <span {...stylex.props(styles.avatar)}>
              {owner && <MemberAvatar member={owner} size={AVATAR_SIZE} />}
            </span>
            <span title={title} {...stylex.props(styles.label)}>
              {title}
            </span>
          </span>
        ),
        onClick: () => {
          if (!active) onOpen(thread.id);
        },
      };
    });
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

/** The header's threads button: every thread of the Channel, one click from the feed. */
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
  const items = useThreadItems(detail, activeId, onOpen);
  if (!items.length) return null;
  return (
    <DropdownMenu items={items} placement="bottomRight">
      <ActionIcon
        aria-label={t('threadList')}
        icon={MessagesCircle}
        size="small"
        title={t('threadList')}
      />
    </DropdownMenu>
  );
};
