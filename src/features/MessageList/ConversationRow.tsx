'use client';

import { ContextMenuTrigger, Flexbox } from '@lobehub/ui';
import * as stylex from '@stylexjs/stylex';
import { type ComponentProps, memo, type MouseEvent, type ReactNode, type Ref } from 'react';
import { useTranslation } from 'react-i18next';

import { activityLabel } from '@/features/Channels/activityLabel';
import { TypingDots } from '@/features/Channels/TypingDots';
import { useWorkspaceAwareNavigate } from '@/features/Workspace/useWorkspaceAwareNavigate';
import WorkspaceLink, { type WorkspaceLinkProps } from '@/features/Workspace/WorkspaceLink';

import {
  type ChannelPreviewThread,
  type ConversationActivity,
  formatConversationTime,
  isPlainClick,
} from './conversations';
import { styles } from './style';

export interface ConversationRowProps {
  active?: boolean;
  activeAt?: Date;
  /**
   * The Agent is replying: the preview line says so in the words the composer's activity line
   * uses, "typing" while the reply is prepared and "working" once it runs.
   */
  activity?: ConversationActivity;
  avatar: ReactNode;
  /**
   * Clicking the open conversation again closes it, back to the Messages home with no row
   * selected. Off for directory lists, whose rows open a profile rather than a conversation.
   */
  closeOnReselect?: boolean;
  contextMenuItems?: ComponentProps<typeof ContextMenuTrigger>['items'];
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
  title: string;
  unread?: number;
  url: string;
}

/** A row link that leaves the conversation when it is already open. Modified clicks keep the link. */
const CloseOnReselectLink = ({
  active,
  onClick,
  ...rest
}: WorkspaceLinkProps & { active?: boolean }) => {
  const navigate = useWorkspaceAwareNavigate();
  return (
    <WorkspaceLink
      {...rest}
      onClick={(event) => {
        if (active && isPlainClick(event)) {
          event.preventDefault();
          navigate('/');
          return;
        }
        onClick?.(event);
      }}
    />
  );
};

const ConversationRow = memo<ConversationRowProps>(
  ({
    active,
    closeOnReselect,
    activeAt,
    avatar,
    contextMenuItems,
    onClick,
    onMouseEnter,
    preview,
    previewThread,
    ref,
    singleLine,
    tag,
    title,
    activity,
    unread,
    url,
  }) => {
    const { t } = useTranslation('channel');
    const link: WorkspaceLinkProps = {
      'aria-current': active ? 'page' : undefined,
      'aria-label': title,
      ref,
      ...stylex.props(styles.row, active && styles.rowActive),
      'to': url,
      onClick,
      onMouseEnter,
    };

    const content = (
      <>
        <span {...stylex.props(styles.avatar)}>
          {avatar}
          {!!unread && unread > 0 && (
            <span {...stylex.props(styles.unread)}>{unread > 99 ? '99+' : unread}</span>
          )}
        </span>
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
            <Flexbox horizontal align={'center'} gap={8}>
              {activity ? (
                <span role="status" {...stylex.props(styles.preview, styles.typing)}>
                  {activityLabel(t(activity === 'working' ? 'status.working' : 'activity.typing'))}
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
            </Flexbox>
          )}
        </Flexbox>
      </>
    );
    const row = closeOnReselect ? (
      <CloseOnReselectLink {...link} active={active}>
        {content}
      </CloseOnReselectLink>
    ) : (
      <WorkspaceLink {...link}>{content}</WorkspaceLink>
    );

    return contextMenuItems ? (
      <ContextMenuTrigger items={contextMenuItems}>{row}</ContextMenuTrigger>
    ) : (
      row
    );
  },
);

ConversationRow.displayName = 'ConversationRow';

export default ConversationRow;
