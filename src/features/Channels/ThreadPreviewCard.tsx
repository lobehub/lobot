import type { ChannelDetail, ChannelPublicMessage, ChannelPublicThread } from '@lobechat/types';
import { Avatar, Icon } from '@lobehub/ui';
import { cssVar } from '@lobehub/ui/stylex/cssVar.stylex';
import * as stylex from '@stylexjs/stylex';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import AgentAvatar from '@/components/AgentAvatar';
import UserAvatar from '@/features/User/UserAvatar';
import { useUserStore } from '@/store/user';
import { userProfileSelectors } from '@/store/user/selectors';

import { activityLabel } from './activityLabel';
import { memberJobStatus, workingJob } from './jobStatus';
import { MemberAvatar } from './MemberAvatar';
import { authorAvatar, isCurrentUserAuthor, memberAvatar, memberName } from './memberName';
import { threadTitle } from './threadTitle';
import { TypingDots } from './TypingDots';

dayjs.extend(relativeTime);

const HOVER = '@media (hover: hover)';
/** Faces enough to say who is in it; the count says how much. */
const MAX_FACES = 3;

const styles = stylex.create({
  entry: {
    display: 'flex',
    gap: 6,
    alignItems: 'center',
    alignSelf: 'flex-start',
    width: '100%',
    maxWidth: 520,
    height: 30,
    // Sit close to the message it continues.
    marginBlockStart: -4,
    marginBlockEnd: 0,
    marginInline: 0,
    paddingBlock: 0,
    paddingInlineStart: 4,
    paddingInlineEnd: 8,
    // One line, not a card: an outline appears only on hover, the way it does in Slack.
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: {
      default: 'transparent',
      [HOVER]: { 'default': 'transparent', ':hover': cssVar.colorBorderSecondary },
    },
    borderRadius: cssVar.borderRadius,
    font: 'inherit',
    fontSize: 13,
    textAlign: 'start',
    backgroundColor: {
      default: 'transparent',
      [HOVER]: { 'default': 'transparent', ':hover': cssVar.colorBgContainer },
    },
    cursor: 'pointer',
  },
  faces: {
    display: 'inline-flex',
    flexShrink: 0,
    gap: 2,
    alignItems: 'center',
  },
  count: {
    flexShrink: 0,
    fontWeight: 600,
    color: cssVar.colorLink,
    whiteSpace: 'nowrap',
  },
  note: {
    overflow: 'hidden',
    display: 'inline-flex',
    gap: 6,
    alignItems: 'center',
    minWidth: 0,
    fontSize: 12,
    color: cssVar.colorTextTertiary,
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  working: { color: cssVar.colorTextSecondary },
  noteText: {
    overflow: 'hidden',
    minWidth: 0,
    textOverflow: 'ellipsis',
  },
  // ChatItem hides every `time` inside a message until hover; this one is content, not a stamp.
  time: { opacity: 1 },
  /** "View thread ›" at the far end, shown only while the line is hovered. */
  go: {
    display: 'inline-flex',
    flexShrink: 0,
    gap: 2,
    alignItems: 'center',
    marginInlineStart: 'auto',
    paddingInlineStart: 8,
    fontSize: 12,
    color: cssVar.colorTextSecondary,
    whiteSpace: 'nowrap',
    opacity: {
      default: 1,
      [HOVER]: {
        default: 0,
        [stylex.when.ancestor(':hover')]: 1,
        [stylex.when.ancestor(':focus-visible')]: 1,
      },
    },
  },
});

/**
 * A message's thread as one line under it: who is in it, how many replies, and when the last
 * came, or that an Agent is working in it right now.
 */
export const ThreadPreviewCard = ({
  detail,
  onOpen,
  root,
  thread,
}: {
  detail: Pick<ChannelDetail, 'jobs' | 'members'>;
  onOpen?: () => void;
  root: ChannelPublicMessage;
  thread: ChannelPublicThread;
}) => {
  const { t } = useTranslation('channel');
  const { lastReply, replyCount } = thread;
  const members = detail.members ?? [];
  const job = workingJob((detail.jobs ?? []).filter((entry) => entry.threadId === thread.id));
  const worker = job && members.find((member) => member.id === job.memberId);
  const workerName = job && memberName(worker, t('unnamedAgent'));
  const faces = thread.followerMemberIds
    .map((id) => members.find((member) => member.id === id))
    .filter((member) => !!member)
    .slice(0, MAX_FACES);
  // Same rule as the message header: the viewer's own replies use their live avatar.
  const isOwnReply = useUserStore(
    (s) => !!lastReply && isCurrentUserAuthor(lastReply.author, userProfileSelectors.userId(s)),
  );
  // The line drops the title; hovering it still says what the thread is about.
  const title = threadTitle(root, thread) ?? t('thread');
  return (
    <button
      aria-label={title}
      title={title}
      type="button"
      {...stylex.props(styles.entry)}
      onClick={onOpen}
    >
      <span {...stylex.props(styles.faces)}>
        {faces.length > 0
          ? faces.map((member) => <MemberAvatar key={member.id} member={member} size={20} />)
          : lastReply &&
            (isOwnReply ? (
              <UserAvatar shape="circle" size={20} />
            ) : (
              <Avatar
                avatar={authorAvatar(lastReply.author)}
                shape="circle"
                size={20}
                title={lastReply.author.name ?? undefined}
              />
            ))}
      </span>
      <span {...stylex.props(styles.count)}>
        {/* Views cached before thread summaries existed only know that the thread exists. */}
        {replyCount ? t('threadCard.replies', { count: replyCount }) : t('openThread')}
      </span>
      {job ? (
        // The reply on its way is newer than the last one posted, so it takes that place.
        <span role="status" {...stylex.props(styles.note, styles.working)}>
          {/* Who is replying, then the same typing dots as everywhere else an Agent works. */}
          <AgentAvatar
            agentId={worker?.agentId}
            avatar={memberAvatar(worker)}
            name={workerName}
            shape={'circle'}
            size={16}
            title={workerName}
          />
          <span {...stylex.props(styles.noteText)}>
            {activityLabel(
              t('activity.one', { name: workerName, status: t(memberJobStatus(job)) }),
            )}
          </span>
          <TypingDots />
        </span>
      ) : (
        lastReply && (
          <span {...stylex.props(styles.note)}>
            <span {...stylex.props(styles.noteText)}>
              {t('threadCard.lastReply')}{' '}
              <time
                dateTime={new Date(lastReply.createdAt).toISOString()}
                {...stylex.props(styles.time)}
              >
                {dayjs(lastReply.createdAt).fromNow()}
              </time>
            </span>
          </span>
        )
      )}
      <span {...stylex.props(styles.go)}>
        {t('threadCard.view')}
        <Icon icon={ChevronRight} size={12} />
      </span>
    </button>
  );
};
