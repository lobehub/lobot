import { Icon } from '@lobehub/ui';
import type { ChannelDetail, ChannelThreadStatus } from '@lobot/types';
import * as stylex from '@stylexjs/stylex';
import { useTranslation } from 'react-i18next';
import { shallow } from 'zustand/shallow';

import { channelSelectors, useChannelStore } from '@/store/channel';

import { styles } from './styles';
import { threadIcon } from './threadIcon';
import { splitThreadRefs } from './threadRefMarkdown';
import { threadTitle } from './threadTitle';

export interface ThreadRefInfo {
  /** `missing`: the Channel's thread list is loaded and the thread is not in it (removed). */
  state: 'found' | 'missing' | 'unknown';
  status?: ChannelThreadStatus;
  title?: string;
}

type ThreadSource = Pick<ChannelDetail, 'messages' | 'threads'> & {
  rootMessage?: ChannelDetail['rootMessage'];
};

/**
 * What a `<#thread>` reference names: the thread as the Channel's latest main-timeline view lists
 * it (that view carries every thread and the roots on its page), else as the thread's own cached
 * view knows it, which also holds the root message a title falls back to.
 */
export const resolveThreadRef = (
  threadId: string,
  { main, own }: { main?: ThreadSource; own?: ThreadSource },
): ThreadRefInfo => {
  const thread =
    main?.threads.find((entry) => entry.id === threadId) ??
    own?.threads.find((entry) => entry.id === threadId);
  if (!thread) return { state: main ? 'missing' : 'unknown' };
  const root =
    main?.messages.find((message) => message.id === thread.rootMessageId) ?? own?.rootMessage;
  return { state: 'found', status: thread.status, title: threadTitle(root, thread) };
};

/**
 * A `<#cht_…>` thread reference in message text, shown like Discord's channel chip: a thread glyph
 * and the thread's title. It opens the thread when the view can; a removed one stays muted text.
 */
export const ThreadRef = ({
  channelId,
  onOpenThread,
  threadId,
}: {
  channelId: string;
  onOpenThread?: (threadId: string) => void;
  threadId: string;
}) => {
  const { t } = useTranslation('channel');
  // Only the resolved fields, compared shallowly: the views are replaced on every poll.
  const { state, status, title } = useChannelStore((s) => {
    const main = channelSelectors.detail({ channelId, threadId: null })(s);
    const own = channelSelectors.detail({ channelId, threadId })(s);
    return resolveThreadRef(threadId, { main, own });
  }, shallow);
  const missing = state === 'missing';
  const label = missing
    ? t('threadRef.unavailable')
    : title || (state === 'found' ? t('thread') : t('threadRef.unknown'));
  const content = (
    <>
      <Icon icon={threadIcon} size={14} />
      <span {...stylex.props(styles.threadRefTitle)}>{label}</span>
    </>
  );
  if (missing || !onOpenThread)
    return (
      <span
        data-thread-id={threadId}
        title={label}
        {...stylex.props(styles.threadRef, missing && styles.threadRefMuted)}
      >
        {content}
      </span>
    );
  return (
    <button
      data-thread-id={threadId}
      title={status === 'archived' ? `${label} · ${t('archived')}` : label}
      type="button"
      {...stylex.props(styles.threadRef, styles.threadRefClickable)}
      onClick={() => onOpenThread(threadId)}
    >
      {content}
    </button>
  );
};

/**
 * One line of plain message text, as a reply quote shows it, with its `<#cht_…>` references as
 * the same (inert) chips the message body shows, not the raw token.
 */
export const ThreadRefText = ({ channelId, text }: { channelId?: string; text: string }) => {
  if (!channelId) return text;
  return splitThreadRefs(text).map((part, index) =>
    typeof part === 'string' ? (
      part
    ) : (
      <ThreadRef channelId={channelId} key={index} threadId={part.threadId} />
    ),
  );
};
