import type { ChannelDetail, ChannelPublicMember } from '@lobot/types';
import * as stylex from '@stylexjs/stylex';
import { useTranslation } from 'react-i18next';

import { channelSelectors, useChannelStore } from '@/store/channel';

import { memberCurrentJob, memberJobStatus, workingConversations } from './jobStatus';
import { statusStyles } from './styles';
import { browseThreads, ThreadCard } from './ThreadBrowser';
import { useMentionedThreadIds, useUnreadThreadIds } from './threadReads';

interface WorkingEntry {
  conversations?: (string | null)[];
  label: string;
}

/**
 * The conversations a member works in at once, as the thread browser's cards: a click on a
 * Thread opens it. The main conversation, when among them, leads as a plain card.
 */
export const WorkingConversations = ({
  detail,
  embedded,
  entry,
  onOpenThread,
}: {
  detail: ChannelDetail;
  /** Inside the profile card, rather than a popup of its own. */
  embedded?: boolean;
  entry: WorkingEntry;
  onOpenThread?: (threadId: string) => void;
}) => {
  const { t } = useTranslation('channel');
  const ids = entry.conversations ?? [];
  const unreadIds = useUnreadThreadIds(detail.threads, detail.members);
  const mentionedIds = useMentionedThreadIds(
    useChannelStore(channelSelectors.listed(detail.channel.id))?.threadMentions,
  );
  const threads = browseThreads(detail, {
    activeId: null,
    fallbackTitle: () => t('thread'),
    mentionedIds,
    query: '',
    unreadIds,
  }).filter((item) => ids.includes(item.thread.id));
  return (
    <div {...stylex.props(embedded ? statusStyles.workingInCard : statusStyles.workingPopover)}>
      <div {...stylex.props(statusStyles.workingHeading)}>{entry.label}</div>
      {ids.includes(null) && <div {...stylex.props(statusStyles.workingMain)}>{t('main')}</div>}
      {threads.map((item) => (
        <ThreadCard
          detail={detail}
          entry={item}
          key={item.thread.id}
          showFaces={false}
          onOpen={() => onOpenThread?.(item.thread.id)}
        />
      ))}
    </div>
  );
};

/**
 * The work list for a profile card. Nothing while the member is not in the middle of a reply,
 * so an idle card stays the profile alone.
 */
export const MemberWorkList = ({
  detail,
  member,
  onOpenThread,
}: {
  detail: ChannelDetail;
  member: ChannelPublicMember | undefined;
  onOpenThread?: (threadId: string) => void;
}) => {
  const { t } = useTranslation('channel');
  const job =
    member?.actorType === 'agent' ? memberCurrentJob(detail.jobs ?? [], member.id) : undefined;
  const conversations = job ? workingConversations(detail.jobs ?? [], member?.id) : [];
  if (!member || !job || conversations.length === 0) return null;
  return (
    <WorkingConversations
      embedded
      detail={detail}
      entry={{
        conversations,
        label:
          conversations.length > 1
            ? t('activity.parallel', { count: conversations.length })
            : t(memberJobStatus(job)),
      }}
      onOpenThread={onOpenThread}
    />
  );
};
