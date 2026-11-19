import { Icon } from '@lobehub/ui';
import { cssVar } from '@lobehub/ui/stylex/cssVar.stylex';
import type { ChannelDetail, ChannelPublicMessage, ChannelPublicThread } from '@lobot/types';
import * as stylex from '@stylexjs/stylex';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { Archive, ChevronRight, CornerDownRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import AgentAvatar from '@/components/AgentAvatar';
import UserAvatar from '@/features/User/UserAvatar';
import { useUserStore } from '@/store/user';
import { userProfileSelectors } from '@/store/user/selectors';
import { markdownToTxt } from '@/utils/markdownToTxt';

import { activityLabel } from './activityLabel';
import { AuthorAvatar } from './AuthorAvatar';
import { memberJobStatus, workingJob } from './jobStatus';
import { isCurrentUserAuthor, memberAvatar, memberName } from './memberName';
import { threadTitle } from './threadTitle';
import { TypingDots } from './TypingDots';

dayjs.extend(relativeTime);

const HOVER = '@media (hover: hover)';

const oneLine = (text: string) => text.replaceAll(/\s+/g, ' ').trim();

const styles = stylex.create({
  entry: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
    alignSelf: 'flex-start',
    width: '100%',
    maxWidth: 520,
    // Sit close to the message it continues.
    marginBlockStart: -4,
    marginBlockEnd: 0,
    marginInline: 0,
    paddingBlock: 4,
    paddingInlineStart: 6,
    paddingInlineEnd: 8,
    // Not a card: an outline appears only on hover, the way it does in Slack.
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
  /** The ↳ glyph, then what the thread is about, above its reply line. */
  head: {
    display: 'flex',
    gap: 6,
    alignItems: 'center',
    minWidth: 0,
  },
  arrow: {
    display: 'inline-flex',
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    width: 16,
    color: cssVar.colorTextSecondary,
  },
  title: {
    overflow: 'hidden',
    minWidth: 0,
    fontWeight: 500,
    color: cssVar.colorText,
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  /** "N replies ›" right after the title: how much was said, and that the row opens it. */
  count: {
    display: 'inline-flex',
    flexShrink: 0,
    gap: 2,
    alignItems: 'center',
    fontSize: 12,
    fontWeight: 600,
    color: cssVar.colorLink,
    whiteSpace: 'nowrap',
  },
  /** The latest word in the thread, under the title like Discord's thread card. */
  line: {
    display: 'flex',
    gap: 6,
    alignItems: 'center',
    minWidth: 0,
    height: 22,
    // Past the arrow column (16px glyph + 6px gap), so the avatar lines up with the title.
    paddingInlineStart: 22,
    fontSize: 12,
    color: cssVar.colorTextTertiary,
  },
  author: {
    flexShrink: 0,
    maxWidth: 160,
    overflow: 'hidden',
    fontWeight: 600,
    color: cssVar.colorTextSecondary,
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  preview: {
    overflow: 'hidden',
    minWidth: 0,
    color: cssVar.colorTextSecondary,
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  working: {
    overflow: 'hidden',
    display: 'inline-flex',
    gap: 6,
    alignItems: 'center',
    minWidth: 0,
    color: cssVar.colorTextSecondary,
  },
  workingText: {
    overflow: 'hidden',
    minWidth: 0,
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  // An archived thread steps back: a quieter title and a grey count.
  archivedTitle: { color: cssVar.colorTextSecondary },
  archivedCount: { fontWeight: 500, color: cssVar.colorTextTertiary },
  // ChatItem hides every `time` inside a message until hover; this one is content, not a stamp.
  time: { flexShrink: 0, whiteSpace: 'nowrap', opacity: 1 },
});

/**
 * A message's thread under it, the way Discord shows one: its title and reply count, then the
 * latest reply with who wrote it and when, or the Agent working in it right now.
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
  // Same rule as the message header: the viewer's own replies use their live avatar.
  const isOwnReply = useUserStore(
    (s) => !!lastReply && isCurrentUserAuthor(lastReply.author, userProfileSelectors.userId(s)),
  );
  const title = threadTitle(root, thread) ?? t('thread');
  const archived = thread.status === 'archived';
  const preview = lastReply && oneLine(markdownToTxt(lastReply.content));
  return (
    <button type="button" {...stylex.props(styles.entry)} onClick={onOpen}>
      <span {...stylex.props(styles.head)}>
        {/* The sidebar's thread glyph: this continues the message above; an archived one says so. */}
        <span {...stylex.props(styles.arrow)}>
          <Icon icon={archived ? Archive : CornerDownRight} size={14} />
        </span>
        <span {...stylex.props(styles.title, archived && styles.archivedTitle)}>{title}</span>
        <span {...stylex.props(styles.count, archived && styles.archivedCount)}>
          {/* Views cached before thread summaries existed only know that the thread exists. */}
          {replyCount ? t('threadCard.replies', { count: replyCount }) : t('openThread')}
          <Icon icon={ChevronRight} size={12} />
        </span>
      </span>
      {job ? (
        // The reply on its way is newer than the last one posted, so it takes that place.
        <span {...stylex.props(styles.line)}>
          <span role="status" {...stylex.props(styles.working)}>
            {/* Who is replying, then the same typing dots as everywhere else an Agent works. */}
            <AgentAvatar
              agentId={worker?.agentId}
              avatar={memberAvatar(worker)}
              name={workerName}
              shape={'circle'}
              size={16}
              title={workerName}
            />
            <span {...stylex.props(styles.workingText)}>
              {activityLabel(
                t('activity.one', { name: workerName, status: t(memberJobStatus(job)) }),
              )}
            </span>
            <TypingDots />
          </span>
        </span>
      ) : (
        // An archived thread is done: its title and count are enough, the last word is noise.
        !archived &&
        lastReply && (
          <span {...stylex.props(styles.line)}>
            {isOwnReply ? (
              <UserAvatar shape="circle" size={16} />
            ) : (
              // Without an image of their own, the face the thread shows: an Agent's generated
              // character, a person's pixel avatar.
              <AuthorAvatar author={lastReply.author} size={16} />
            )}
            <span {...stylex.props(styles.author)}>
              {lastReply.author.name || t('deletedMember')}
            </span>
            <span {...stylex.props(styles.preview)}>{preview || t('reply.attachment')}</span>
            <time
              dateTime={new Date(lastReply.createdAt).toISOString()}
              {...stylex.props(styles.time)}
            >
              {dayjs(lastReply.createdAt).fromNow()}
            </time>
          </span>
        )
      )}
    </button>
  );
};
