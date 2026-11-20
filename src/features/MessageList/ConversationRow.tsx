'use client';

import { type ContextMenuItem, ContextMenuTrigger, Flexbox, Icon } from '@lobehub/ui';
import * as stylex from '@stylexjs/stylex';
import { BellOffIcon, EyeOffIcon } from 'lucide-react';
import { type ComponentProps, memo, type MouseEvent, type ReactNode, type Ref } from 'react';
import { useTranslation } from 'react-i18next';

import { activityLabel } from '@/features/Channels/activityLabel';
import { TypingDots } from '@/features/Channels/TypingDots';
import WorkspaceLink, { type WorkspaceLinkProps } from '@/features/Workspace/WorkspaceLink';
import type { NativeContextMenuItem } from '@/libs/contextMenu/types';

import { useConversationDrag } from './ConversationDrag';
import {
  type ChannelPreviewThread,
  type ConversationActivity,
  formatConversationTime,
} from './conversations';
import { hideConversation } from './hiddenConversations';
import { styles } from './style';

interface ConversationRowProps {
  active?: boolean;
  activeAt?: Date;
  /**
   * The Agent is replying: the preview line says so in the words the composer's activity line
   * uses, "typing" while the reply is prepared and "working" once it runs.
   */
  activity?: ConversationActivity;
  /**
   * How many conversations the reply runs in at once (an Agent's main one and its Threads); two
   * or more say "Working on N things" instead.
   */
  activityCount?: number;
  avatar: ReactNode;
  contextMenuItems?: ComponentProps<typeof ContextMenuTrigger>['items'];
  /** The Messages list key this row hides by; its menu then offers "Hide chat". */
  hideKey?: string;
  /**
   * An unread message here @mentions me: the preview line opens with a red "[@me]", like
   * WeChat's 有人@我, so the row stands out among plain unread ones.
   */
  mentioned?: boolean;
  /**
   * The person muted this conversation: unread messages show as a dot instead of a count, and a
   * muted bell sits at the end of the preview line, like WeChat.
   */
  muted?: boolean;
  onClick?: (event: MouseEvent<HTMLAnchorElement>) => void;
  onMouseEnter?: () => void;
  preview?: string;
  /** The Thread the preview's message was posted in; the preview line names it first. */
  previewThread?: ChannelPreviewThread;
  /** The row element, e.g. the anchor for an inline rename popover. */
  ref?: Ref<HTMLElement>;
  /** Title only, no preview line — for directory lists like the contacts tab. */
  singleLine?: boolean;
  /** A muted label after the title, e.g. the project a Channel belongs to. */
  tag?: string;
  /**
   * `solo` is the large card used when this is the only pin; `compact` is the shared size.
   * Only set for a pinned tile.
   */
  tile?: 'solo' | 'pair' | 'compact' | 'dense';
  title: string;
  unread?: number;
  url: string;
  /** `tile` draws a pinned conversation as an avatar card; `row` is the regular list line. */
  variant?: 'row' | 'tile';
}

type MenuItems = ComponentProps<typeof ContextMenuTrigger>['items'];

/** Puts "Hide chat" after the row's leading pin action, like WeChat's chat menu. */
const withHideItem = (items: MenuItems, hide: ContextMenuItem | '' | undefined): MenuItems => {
  if (!hide) return items;
  const insert = (list: ContextMenuItem[] = []) => {
    const first = list[0];
    const afterPin = !!first && 'key' in first && /pin$/i.test(String(first.key));
    return afterPin ? [first, hide, ...list.slice(1)] : [hide, ...list];
  };
  return typeof items === 'function' ? () => insert(items()) : insert(items);
};

const ConversationRow = memo<ConversationRowProps>(
  ({
    active,
    activeAt,
    avatar,
    contextMenuItems,
    hideKey,
    mentioned,
    muted,
    onClick,
    onMouseEnter,
    preview,
    previewThread,
    ref,
    singleLine,
    tag,
    tile,
    title,
    activity,
    activityCount = 0,
    unread,
    url,
    variant = 'row',
  }) => {
    const isTile = variant === 'tile';
    const drag = useConversationDrag();
    const { t } = useTranslation('channel');
    const menuItems = withHideItem(
      contextMenuItems,
      hideKey &&
        ({
          icon: <Icon icon={EyeOffIcon} />,
          key: 'hideConversation',
          label: t('messageList.hide', { ns: 'common' }),
          onClick: () => hideConversation(hideKey),
          sfSymbol: 'eye.slash',
        } as NativeContextMenuItem as ContextMenuItem),
    );
    const link: WorkspaceLinkProps = {
      'aria-current': active ? 'page' : undefined,
      'aria-label': title,
      'ref': (node: HTMLElement | null) => {
        drag?.setNodeRef(node);
        if (typeof ref === 'function') ref(node);
        else if (ref) ref.current = node;
      },
      ...stylex.props(
        isTile ? styles.tile : styles.row,
        isTile && tile === 'dense' && styles.tileDense,
        isTile && tile === 'pair' && styles.tilePair,
        isTile && tile === 'solo' && styles.tileSolo,
        active && (isTile ? styles.tileActive : styles.rowActive),
        drag?.isDragging && styles.dragging,
      ),
      'to': url,
      onClick,
      onMouseEnter,
      // The list drags with the mouse and touch sensors, which listen for mousedown and touchstart.
      ...(drag?.listeners as WorkspaceLinkProps | undefined),
    };

    const avatarNode = (
      <span {...stylex.props(styles.avatar)}>
        {avatar}
        {!!unread &&
          unread > 0 &&
          (muted ? (
            <span {...stylex.props(styles.unreadDot)} />
          ) : (
            <span {...stylex.props(styles.unread)}>{unread > 99 ? '99+' : unread}</span>
          ))}
      </span>
    );

    const content = isTile ? (
      <>
        {avatarNode}
        <span {...stylex.props(styles.tileTitle)}>{title}</span>
      </>
    ) : (
      <>
        {avatarNode}
        <Flexbox
          flex={1}
          gap={2}
          justify={'center'}
          {...stylex.props(styles.rowText, singleLine && styles.rowTextSingleLine)}
        >
          <Flexbox horizontal align={'center'} gap={8}>
            <span {...stylex.props(styles.title)}>
              {title}
              {tag && <span {...stylex.props(styles.tag)}>{tag}</span>}
            </span>
            {activeAt && (
              <span {...stylex.props(styles.time)}>{formatConversationTime(activeAt)}</span>
            )}
          </Flexbox>
          {/* No preview: the title sits centered at the full row height, not over a blank line. */}
          {!singleLine && (activity || preview) && (
            <Flexbox horizontal align={'center'} gap={4}>
              {mentioned && <span {...stylex.props(styles.mentioned)}>{t('mentionedYou')}</span>}
              {activity ? (
                <span role="status" {...stylex.props(styles.preview, styles.typing)}>
                  {activityLabel(
                    activityCount > 1
                      ? t('activity.parallel', { count: activityCount })
                      : t(activity === 'working' ? 'status.working' : 'activity.typing'),
                  )}
                  <TypingDots />
                </span>
              ) : (
                <span {...stylex.props(styles.preview)}>
                  {previewThread
                    ? t('threadPreview', {
                        content: preview,
                        title: previewThread.title || t('thread'),
                      })
                    : preview}
                </span>
              )}
              {muted && (
                <span aria-label={t('muted')} role="img" {...stylex.props(styles.mutedIcon)}>
                  <Icon icon={BellOffIcon} size={12} />
                </span>
              )}
            </Flexbox>
          )}
        </Flexbox>
      </>
    );
    const row = (
      // A badge's jump to the next unread row finds it by the key it is hidden by.
      <WorkspaceLink {...link} data-conversation-key={hideKey}>
        {content}
      </WorkspaceLink>
    );

    return menuItems ? <ContextMenuTrigger items={menuItems}>{row}</ContextMenuTrigger> : row;
  },
);

ConversationRow.displayName = 'ConversationRow';

export default ConversationRow;
