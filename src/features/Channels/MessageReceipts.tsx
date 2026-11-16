import type {
  ChannelDetail,
  ChannelPublicJob,
  ChannelPublicMember,
  ChannelPublicMessage,
} from '@lobechat/types';
import { Button, Flexbox, Popover, Text, usePopoverContext } from '@lobehub/ui';
import * as stylex from '@stylexjs/stylex';
import { Square } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import AgentAvatar from '@/components/AgentAvatar';
import AsyncError from '@/components/AsyncError';
import { channelActions } from '@/store/channel';

import { BlockedDevice } from './BlockedDevice';
import { canManageAgents } from './channelAccess';
import { ChannelStatus } from './ChannelStatus';
import { channelJobStatus, channelJobTone, isChannelJobActive, isDeviceFailure } from './jobStatus';
import { memberAvatar, memberName } from './memberName';
import { statusStyles, styles } from './styles';
import { useOpenReplyAgent } from './useOpenReplyAgent';

export interface ReplyEntry {
  agentId?: string | null;
  avatar?: string;
  job: ChannelPublicJob;
  member?: ChannelPublicMember;
  name: string;
}

/** Names and avatars for jobs, from the members that own them. */
export const replyEntries = (
  detail: ChannelDetail,
  jobs: ChannelPublicJob[],
  fallbackName: string,
): ReplyEntry[] =>
  jobs.map((job) => {
    const member = (detail.members ?? []).find((entry) => entry.id === job.memberId);
    return {
      agentId: member?.agentId,
      avatar: memberAvatar(member),
      job,
      member,
      name: memberName(member, fallbackName),
    };
  });

/**
 * One reply: its state, why it failed or what device it waits for, and how to stop it or open
 * its Agent. `manageable` viewers (Channel admins) also see that device and can change it.
 */
export function ReplyDetail({
  channelId,
  entry: { agentId, avatar, job, member, name },
  manageable,
}: {
  channelId: string;
  entry: ReplyEntry;
  manageable?: boolean;
}) {
  const { t } = useTranslation('channel');
  const { close } = usePopoverContext();
  const openAgent = useOpenReplyAgent(agentId, close);
  const deviceFailure = isDeviceFailure(job);
  const [stopping, setStopping] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [error, setError] = useState<unknown>();
  const stop = async () => {
    setStopping(true);
    setError(undefined);
    try {
      await channelActions.stop(channelId, { jobId: job.id });
    } catch (cause) {
      console.error('Failed to stop Channel reply', cause);
      setError(cause);
    } finally {
      setStopping(false);
    }
  };
  const retry = async () => {
    setRetrying(true);
    setError(undefined);
    try {
      await channelActions.retryJob(channelId, job);
    } catch (cause) {
      console.error('Failed to retry Channel reply', cause);
      setError(cause);
    } finally {
      setRetrying(false);
    }
  };
  // Whoever may stop a reply may retry it. A failed run still being released cannot start again.
  const retryButton = job.canStop && !job.writerHeld && (
    <Button
      loading={retrying}
      size="small"
      style={{ flexShrink: 0 }}
      type="primary"
      onClick={() => void retry()}
    >
      {t('receipt.retry')}
    </Button>
  );
  return (
    <Flexbox gap={8}>
      <Flexbox horizontal align="center" gap={8}>
        <AgentAvatar
          agentId={agentId}
          avatar={avatar}
          name={name}
          shape={'circle'}
          size={24}
          title={name}
        />
        {/* Name, then its state; the stop action sits at the far end of the same row. The name
            opens the Agent without an icon, keeps its own width and only shrinks (to an ellipsis)
            when the row runs out. */}
        {agentId ? (
          <Button
            aria-label={t('openAgentNamed', { name })}
            outdent="start"
            size="small"
            style={{ flex: '0 1 auto', minWidth: 0 }}
            title={t('openAgentNamed', { name })}
            type="text"
            onClick={openAgent}
          >
            <Text ellipsis as="span" style={{ minWidth: 0 }} weight={500}>
              {name}
            </Text>
          </Button>
        ) : (
          <Text ellipsis style={{ flex: '0 1 auto', minWidth: 0 }} weight={500}>
            {name}
          </Text>
        )}
        {/* The state stays whole on the row; the name gives way first. */}
        <span style={{ flexShrink: 0, whiteSpace: 'nowrap' }}>
          <ChannelStatus label={t(channelJobStatus(job))} tone={channelJobTone(job)} />
        </span>
        {job.canStop && isChannelJobActive(job) && (
          <Button
            danger
            icon={Square}
            loading={stopping}
            size="small"
            style={{ flexShrink: 0, marginInlineStart: 'auto' }}
            type="text"
            onClick={() => void stop()}
          >
            {t('stopReply')}
          </Button>
        )}
      </Flexbox>
      {job.status === 'queued' && job.blockedCode === 'device_offline' && (
        <BlockedDevice
          waiting
          channelId={channelId}
          deviceId={job.deviceId}
          manageable={manageable}
          member={member}
        />
      )}
      {job.worktreeBranch && (
        <Text ellipsis fontSize={12} title={job.worktreeBranch} type="secondary">
          {t('receipt.worktree', { branch: job.worktreeBranch })}
        </Text>
      )}
      {job.status === 'failed' && (
        <Flexbox gap={4}>
          <Text weight={500}>{t('receipt.errorReason')}</Text>
          <Text style={{ overflowWrap: 'anywhere', whiteSpace: 'pre-wrap' }}>
            {/* A known cause reads in the viewer's language; others keep the server's diagnostic. */}
            {deviceFailure
              ? t('receipt.deviceUnreachable')
              : job.errorMessage?.trim() || t('receipt.errorUnavailable')}
          </Text>
        </Flexbox>
      )}
      {deviceFailure && (
        <BlockedDevice
          channelId={channelId}
          deviceId={job.deviceId}
          manageable={manageable}
          member={member}
          retry={retryButton || undefined}
        />
      )}
      {error !== undefined && <AsyncError error={error} variant="inline" />}
    </Flexbox>
  );
}

/** Replies listed one after another, as popover content. */
export function ReplyList({
  channelId,
  entries,
  manageable,
}: {
  channelId: string;
  entries: ReplyEntry[];
  manageable?: boolean;
}) {
  return (
    <Flexbox gap={16} {...stylex.props(statusStyles.popover, statusStyles.replyList)}>
      {entries.map((entry) => (
        <ReplyDetail
          channelId={channelId}
          entry={entry}
          key={entry.job.id}
          manageable={manageable}
        />
      ))}
    </Flexbox>
  );
}

/**
 * A text-less marker beside a message whose reply failed, so the failure flagged in the
 * header can be traced to its message. The reason is one click away.
 */
export function MessageFailureMark({
  detail,
  message,
}: {
  detail: ChannelDetail;
  message: ChannelPublicMessage;
}) {
  const { t, i18n } = useTranslation('channel');
  const failed = (detail.jobs ?? []).filter(
    (job) => job.messageId === message.id && job.status === 'failed',
  );
  if (!failed.length) return null;
  const entries = replyEntries(detail, failed, t('unnamedAgent'));
  const label = t('failure.messageLabel', {
    names: new Intl.ListFormat(i18n.language, { type: 'conjunction' }).format(
      entries.map((entry) => entry.name),
    ),
  });
  return (
    <Popover
      placement="bottomLeft"
      trigger="click"
      content={
        <ReplyList
          channelId={detail.channel.id}
          entries={entries}
          manageable={canManageAgents(detail.channel)}
        />
      }
    >
      <button
        aria-label={label}
        title={label}
        type="button"
        {...stylex.props(statusStyles.failureMark)}
      >
        <span aria-hidden {...stylex.props(statusStyles.dot)} />
      </button>
    </Popover>
  );
}

/** A message that no Agent picked up; the routing outcome stays with the message. */
export function MessageRoutingStatus({ message }: { message: ChannelPublicMessage }) {
  const { t } = useTranslation('channel');
  if (message.routingStatus !== 'unassigned') return null;
  return (
    <span role="status" {...stylex.props(statusStyles.receipts, styles.muted)}>
      {t('routing.unassigned')}
    </span>
  );
}
