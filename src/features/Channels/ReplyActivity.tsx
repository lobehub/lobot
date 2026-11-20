import { Button, Popover } from '@lobehub/ui';
import type { ChannelDetail } from '@lobot/types';
import * as stylex from '@stylexjs/stylex';
import { useTranslation } from 'react-i18next';

import AgentAvatar from '@/components/AgentAvatar';

import { activityLabel } from './activityLabel';
import { canManageAgents } from './channelAccess';
import {
  channelJobStatus,
  conversationReplies,
  memberCurrentJob,
  workingConversationCount,
} from './jobStatus';
import { replyEntries, ReplyList } from './MessageReceipts';
import { REPLY_POPUP_PROPS } from './replyPopup';
import { activityStyles } from './styles';
import { TypingDots } from './TypingDots';

const MAX_AVATARS = 3;

/**
 * Who is replying in this conversation, above the composer like a chat app's typing line.
 * One click lists each reply with its state and a stop action.
 */
export function ReplyActivity({
  detail,
  threadId,
}: {
  detail: ChannelDetail;
  threadId: string | null;
}) {
  const { t, i18n } = useTranslation('channel');
  const jobs = conversationReplies(detail, threadId);
  if (!jobs.length) return null;

  const entries = replyEntries(detail, jobs, t('unnamedAgent'));
  // One Agent may have several requests queued; describe each Agent once.
  const members = [...new Map(entries.map((entry) => [entry.job.memberId, entry])).values()];
  const names = members.map((entry) => entry.name);
  // A lone Agent working in several places at once (this conversation and its Threads, whose
  // replies at work the main view carries) says how many, as its direct conversation does.
  const soleMemberId = members.length === 1 ? members[0].job.memberId : undefined;
  const parallel = soleMemberId ? workingConversationCount(detail.jobs ?? [], soleMemberId) : 0;
  const label = soleMemberId
    ? t('activity.one', {
        name: names[0],
        status:
          parallel > 1
            ? t('activity.parallel', { count: parallel })
            : t(channelJobStatus(memberCurrentJob(jobs, soleMemberId)!)),
      })
    : members.length === 2
      ? t('activity.two', {
          names: new Intl.ListFormat(i18n.language, { type: 'conjunction' }).format(names),
        })
      : t('activity.many', { count: members.length });
  const avatars = members.slice(0, MAX_AVATARS);

  return (
    <Popover
      placement="topLeft"
      popupProps={REPLY_POPUP_PROPS}
      trigger="click"
      content={
        <ReplyList
          channelId={detail.channel.id}
          entries={entries}
          manageable={canManageAgents(detail.channel)}
        />
      }
    >
      <Button
        size="small"
        type="text"
        {...stylex.props(activityStyles.line, activityStyles.button)}
      >
        <span aria-hidden {...stylex.props(activityStyles.avatars)}>
          {avatars.map((entry) => (
            <AgentAvatar
              agentId={entry.agentId}
              avatar={entry.avatar}
              key={entry.job.id}
              name={entry.name}
              shape={'circle'}
              size={16}
              title={entry.name}
            />
          ))}
        </span>
        <span role="status" {...stylex.props(activityStyles.label)}>
          {activityLabel(label)}
        </span>
        <TypingDots />
      </Button>
    </Popover>
  );
}
