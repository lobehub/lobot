import { AGENT_CHAT_TOPIC_URL } from '@lobechat/const';
import { Button, Flexbox, Icon, Text } from '@lobehub/ui';
import { cssVar } from '@lobehub/ui/stylex/cssVar.stylex';
import type {
  ChannelDetail,
  ChannelPublicMessage,
  ChannelReplyError,
  ChannelReplyErrorAction,
} from '@lobot/types';
import * as stylex from '@stylexjs/stylex';
import { ChevronDown, ChevronRight, CircleAlert, ExternalLink } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import AsyncError from '@/components/AsyncError';
import { openInWebApp } from '@/features/Electron/navigation/webApp';
import { channelActions } from '@/store/channel';

import { openChannelAgentEnvironment } from './AgentEnvironment';
import { canManageAgents } from './channelAccess';
import { unresolvedFailures } from './jobStatus';

const local = stylex.create({
  card: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    maxWidth: 560,
    padding: 12,
    borderColor: cssVar.colorBorderSecondary,
    borderStyle: 'solid',
    borderWidth: 1,
    borderRadius: cssVar.borderRadius,
    background: cssVar.colorBgContainerSecondary,
  },
  summary: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 8,
    color: cssVar.colorText,
    overflowWrap: 'anywhere',
  },
  icon: {
    flexShrink: 0,
    marginBlockStart: 3,
    color: cssVar.colorError,
  },
  details: {
    margin: 0,
    padding: 8,
    borderRadius: cssVar.borderRadiusSM,
    background: cssVar.colorFillTertiary,
    color: cssVar.colorTextSecondary,
    fontFamily: cssVar.fontFamilyCode,
    fontSize: 12,
    overflowWrap: 'anywhere',
    whiteSpace: 'pre-wrap',
  },
});

const ACTION_LABEL = {
  resume: 'replyError.resume',
  retry: 'receipt.retry',
  switch_device: 'replyError.switchDevice',
} as const satisfies Record<ChannelReplyErrorAction, string>;

/**
 * The card the server posts in an Agent's reply slot when its reply failed for a system reason:
 * one sentence on what went wrong, the actions it recommends (the first one primary), the raw
 * diagnostic folded under details, and the Agent topic for whoever ran it.
 *
 * Actions stay only while the failure is the Agent's newest reply in this branch and the viewer
 * may act on it (its requester or an admin); a reply retried, resumed or followed since leaves
 * the card as history. Switching device opens the Agent's Channel environment, for admins only.
 */
export function ReplyErrorCard({
  detail,
  message,
  replyError,
}: {
  detail: ChannelDetail;
  message: Pick<ChannelPublicMessage, 'agentId' | 'threadId'>;
  replyError: ChannelReplyError;
}) {
  const { t } = useTranslation('channel');
  const [expanded, setExpanded] = useState(false);
  const [pending, setPending] = useState<ChannelReplyErrorAction>();
  const [error, setError] = useState<unknown>();
  const channelId = detail.channel.id;
  const jobs = detail.jobs ?? [];
  const job = jobs.find((entry) => entry.id === replyError.jobId);
  const member = (detail.members ?? []).find((entry) =>
    job ? entry.id === job.memberId : !!message.agentId && entry.agentId === message.agentId,
  );
  const unresolved =
    !!job &&
    unresolvedFailures(
      jobs.filter((entry) => (entry.threadId ?? null) === (job.threadId ?? null)),
    ).some((entry) => entry.id === job.id);
  const actionable = !!job && unresolved && job.canStop && !job.writerHeld;
  const manageable = canManageAgents(detail.channel) && !!member;
  const actions = actionable
    ? replyError.actions.filter((action) => action !== 'switch_device' || manageable)
    : [];
  const agentId = member?.agentId ?? message.agentId;
  const topicId = job?.topicId;
  const hasDetails = !!(replyError.errorType || replyError.errorMessage?.trim());

  const run = async (action: ChannelReplyErrorAction) => {
    if (!job) return;
    if (action === 'switch_device') {
      if (member) openChannelAgentEnvironment(channelId, member);
      return;
    }
    setPending(action);
    setError(undefined);
    try {
      await (action === 'resume'
        ? channelActions.resumeJob(channelId, job)
        : channelActions.retryJob(channelId, job));
    } catch (cause) {
      console.error(`Failed to ${action} Channel reply`, cause);
      setError(cause);
    } finally {
      setPending(undefined);
    }
  };

  return (
    <div data-reply-error={replyError.jobId} {...stylex.props(local.card)}>
      <div {...stylex.props(local.summary)}>
        <span aria-hidden {...stylex.props(local.icon)}>
          <Icon icon={CircleAlert} size={16} />
        </span>
        <span>{replyError.summary}</span>
      </div>
      {replyError.attempts > 1 && (
        <Text fontSize={12} type="secondary">
          {t('replyError.attempts', { count: replyError.attempts })}
        </Text>
      )}
      {(actions.length > 0 || hasDetails || (agentId && topicId)) && (
        <Flexbox horizontal align="center" gap={8} wrap="wrap">
          {actions.map((action, index) => (
            <Button
              disabled={!!pending && pending !== action}
              key={action}
              loading={pending === action}
              size="small"
              type={index === 0 ? 'primary' : 'default'}
              onClick={() => void run(action)}
            >
              {t(ACTION_LABEL[action])}
            </Button>
          ))}
          {hasDetails && (
            <Button
              aria-expanded={expanded}
              icon={expanded ? ChevronDown : ChevronRight}
              size="small"
              type="text"
              onClick={() => setExpanded(!expanded)}
            >
              {t('replyError.details')}
            </Button>
          )}
          {/* The member who ran the reply can read what happened in its topic on LobeHub. */}
          {agentId && topicId && (
            <Button
              icon={ExternalLink}
              size="small"
              type="text"
              onClick={() => openInWebApp(AGENT_CHAT_TOPIC_URL(agentId, topicId))}
            >
              {t('receipt.openTopic')}
            </Button>
          )}
        </Flexbox>
      )}
      {expanded && hasDetails && (
        <pre {...stylex.props(local.details)}>
          {[replyError.errorType, replyError.errorMessage?.trim()].filter(Boolean).join('\n')}
        </pre>
      )}
      {error !== undefined && <AsyncError error={error} variant="inline" />}
    </div>
  );
}
