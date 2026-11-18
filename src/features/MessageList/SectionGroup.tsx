'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ContextMenuTrigger, Icon } from '@lobehub/ui';
import * as stylex from '@stylexjs/stylex';
import { ChevronRightIcon, PencilLine, Trash } from 'lucide-react';
import { memo, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { useChannelSections } from '@/features/Channels/useChannelSections';
import { channelActions } from '@/store/channel';

import type { ConversationEntry, SectionGroup as SectionGroupData } from './conversations';
import { styles } from './style';

interface SectionGroupProps {
  group: SectionGroupData;
  renderEntry: (entry: ConversationEntry) => ReactNode;
  /** A search lists every match, so a folded section opens while it runs. */
  searching: boolean;
}

/** What a folded section still shows: the unread messages of its conversations. */
const unreadOf = (entries: ConversationEntry[]) =>
  entries.reduce(
    (sum, entry) =>
      sum +
      (entry.channel?.mutedAt
        ? (entry.channel.mentionCount ?? 0)
        : (entry.channel?.unreadCount ?? 0)),
    0,
  );

/**
 * One of the person's own sections of the list: a header that folds it, renames or deletes it
 * from its menu and drags to reorder, then its conversations.
 */
const SectionGroup = memo<SectionGroupProps>(
  ({ group: { entries, section }, renderEntry, searching }) => {
    const { t } = useTranslation('channel');
    const { remove, rename } = useChannelSections();
    const { attributes, isDragging, listeners, setNodeRef, transform, transition } = useSortable({
      id: section.id,
    });
    const collapsed = section.collapsed && !searching;
    // A search hides the sections it found nothing in.
    if (searching && entries.length === 0) return null;
    const unread = collapsed ? unreadOf(entries) : 0;

    return (
      // The sortable node wraps the group, so the drag transform stays apart from its styles.
      <div
        ref={setNodeRef}
        style={{
          // The list only reorders vertically, so drop the pointer's x.
          transform: CSS.Translate.toString(transform && { ...transform, x: 0 }),
          transition,
          zIndex: isDragging ? 1 : undefined,
        }}
      >
        <div aria-label={section.name} role="group" {...stylex.props(styles.section)}>
          <ContextMenuTrigger
            items={[
              {
                icon: <Icon icon={PencilLine} />,
                key: 'rename',
                label: t('section.rename'),
                onClick: () => rename(section),
              },
              { type: 'divider' },
              {
                danger: true,
                icon: <Icon icon={Trash} />,
                key: 'delete',
                label: t('section.delete'),
                onClick: () => remove(section),
              },
            ]}
          >
            <button
              aria-expanded={!collapsed}
              type="button"
              {...attributes}
              {...listeners}
              {...stylex.props(styles.sectionHeader)}
              onClick={() => {
                if (searching) return;
                void channelActions
                  .setSectionCollapsed(section.id, !section.collapsed)
                  .catch((error) => console.error('Failed to fold section', error));
              }}
            >
              <Icon
                icon={ChevronRightIcon}
                size={12}
                {...stylex.props(styles.sectionChevron, !collapsed && styles.sectionChevronOpen)}
              />
              <span {...stylex.props(styles.sectionName)}>{section.name}</span>
              {unread > 0 && <span {...stylex.props(styles.sectionUnread)}>{unread}</span>}
            </button>
          </ContextMenuTrigger>
          {!collapsed &&
            (entries.length > 0 ? (
              entries.map(renderEntry)
            ) : (
              <div {...stylex.props(styles.empty)}>{t('section.empty')}</div>
            ))}
        </div>
      </div>
    );
  },
);

SectionGroup.displayName = 'MessageListSectionGroup';

export default SectionGroup;
