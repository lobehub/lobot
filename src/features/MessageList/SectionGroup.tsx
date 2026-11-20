'use client';

import { useDndContext, useDroppable } from '@dnd-kit/core';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ContextMenuTrigger, Icon } from '@lobehub/ui';
import * as stylex from '@stylexjs/stylex';
import { ChevronRightIcon, PencilLine, Trash } from 'lucide-react';
import { memo, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { useChannelSections } from '@/features/Channels/useChannelSections';
import { channelActions } from '@/store/channel';

import {
  conversationDropActions,
  isConversationDragSource,
  SECTION_DROP,
} from './conversationDrop';
import {
  type ConversationEntry,
  type SectionGroup as SectionGroupData,
  UNGROUPED_SECTION_ID,
} from './conversations';
import { sectionHeaderMarker } from './markers.stylex';
import { styles } from './style';

interface SectionGroupProps {
  group: SectionGroupData;
  /** Folds a group the list owns, such as Ungrouped, without writing a section. */
  onToggle?: () => void;
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

interface SectionContentsProps extends SectionGroupProps {
  handle?: Pick<ReturnType<typeof useSortable>, 'attributes' | 'listeners'>;
}

/**
 * The header and rows of one section. A saved section drags, and renames or deletes from its
 * menu; the list's own Ungrouped group only folds.
 */
const SectionContents = memo<SectionContentsProps>(
  ({ group: { entries, section }, handle, onToggle, renderEntry, searching }) => {
    const { t } = useTranslation('channel');
    const { remove, rename } = useChannelSections();
    const saved = section.id !== UNGROUPED_SECTION_ID;
    const name = saved ? section.name : t('section.ungrouped');
    const collapsed = section.collapsed && !searching;
    // A drop files the conversation here. Ungrouped is not a saved section, so it clears one.
    const sectionId = saved ? section.id : null;
    const { isOver, setNodeRef } = useDroppable({
      data: { collapsed, sectionId, type: SECTION_DROP },
      disabled: searching,
      id: `drop-section:${section.id}`,
    });
    const { active } = useDndContext();
    const source = isConversationDragSource(active?.data.current) ? active.data.current : undefined;
    const over =
      isOver &&
      !!source &&
      conversationDropActions(source, { collapsed, sectionId, type: 'section' }).length > 0;
    // A search hides the sections it found nothing in.
    if (searching && entries.length === 0) return null;
    const unread = collapsed ? unreadOf(entries) : 0;

    const header = (
      <button
        aria-expanded={!collapsed}
        type="button"
        {...handle?.attributes}
        {...handle?.listeners}
        {...stylex.props(sectionHeaderMarker, styles.sectionHeader)}
        onClick={() => {
          if (searching) return;
          if (onToggle) {
            onToggle();
            return;
          }
          void channelActions
            .setSectionCollapsed(section.id, !section.collapsed)
            .catch((error) => console.error('Failed to fold section', error));
        }}
      >
        <span {...stylex.props(styles.sectionName)}>{name}</span>
        {unread > 0 && <span {...stylex.props(styles.sectionUnread)}>{unread}</span>}
        <Icon
          icon={ChevronRightIcon}
          size={12}
          {...stylex.props(styles.sectionChevron, !collapsed && styles.sectionChevronOpen)}
        />
      </button>
    );

    return (
      <div
        aria-label={name}
        ref={setNodeRef}
        role="group"
        {...stylex.props(styles.section, over && styles.dropOver)}
      >
        {saved ? (
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
            {header}
          </ContextMenuTrigger>
        ) : (
          header
        )}
        {!collapsed &&
          (entries.length > 0 ? (
            entries.map(renderEntry)
          ) : (
            <div {...stylex.props(styles.empty)}>{t('section.empty')}</div>
          ))}
      </div>
    );
  },
);

SectionContents.displayName = 'MessageListSectionContents';

/** A saved section: the drag transform stays on the wrapper, apart from the group's styles. */
const SortableSection = memo<SectionGroupProps>((props) => {
  const { attributes, isDragging, listeners, setNodeRef, transform, transition } = useSortable({
    id: props.group.section.id,
  });
  if (props.searching && props.group.entries.length === 0) return null;

  return (
    <div
      ref={setNodeRef}
      style={{
        // The list only reorders vertically, so drop the pointer's x.
        transform: CSS.Translate.toString(transform && { ...transform, x: 0 }),
        transition,
        zIndex: isDragging ? 1 : undefined,
      }}
    >
      <SectionContents {...props} handle={{ attributes, listeners }} />
    </div>
  );
});

SortableSection.displayName = 'MessageListSortableSection';

/**
 * One of the person's own sections of the list: a header that folds it, renames or deletes it
 * from its menu and drags to reorder, then its conversations.
 */
const SectionGroup = memo<SectionGroupProps>((props) =>
  props.group.section.id === UNGROUPED_SECTION_ID ? (
    <SectionContents {...props} />
  ) : (
    <SortableSection {...props} />
  ),
);

SectionGroup.displayName = 'MessageListSectionGroup';

export default SectionGroup;
