import type { ChannelDetail } from '@lobechat/types';
import { ActionIcon, type DropdownItem, DropdownMenu } from '@lobehub/ui';
import * as stylex from '@stylexjs/stylex';
import { MessagesCircle } from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { threadTitle } from './threadTitle';

const styles = stylex.create({
  // A title can be a whole first line; the menu stays narrow and the full title shows on hover.
  label: {
    overflow: 'hidden',
    display: 'block',
    maxWidth: 320,
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
});

/**
 * The Channel's threads as menu items, the open one checked. Archived threads stay out, as in
 * the sidebar, unless one of them is open.
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
      return {
        checked: thread.id === activeId,
        // Picking a thread navigates, so the menu goes away like any other navigation.
        closeOnClick: true,
        key: thread.id,
        label: (
          <span title={title} {...stylex.props(styles.label)}>
            {title}
          </span>
        ),
        onCheckedChange: () => {
          if (thread.id !== activeId) onOpen(thread.id);
        },
        type: 'checkbox' as const,
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
