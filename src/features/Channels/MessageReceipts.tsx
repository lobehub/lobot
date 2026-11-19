import { AGENT_CHAT_TOPIC_URL } from '@lobechat/const';
import { ActionIcon, Button, Flexbox, Popover, Text, usePopoverContext } from '@lobehub/ui';
import type {
  ChannelDetail,
  ChannelPublicJob,
  ChannelPublicMember,
  ChannelPublicMessage,
} from '@lobot/types';
import * as stylex from '@stylexjs/stylex';
import { ExternalLink, Square } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import AgentAvatar from '@/components/AgentAvatar';
import AsyncError from '@/components/AsyncError';
import { openInWebApp } from '@/features/Electron/navigation/webApp';
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
 * Where each failed reply shows: after the last message its member already posted in answer
 * to the request (an opening, a partial reply), or right after the request when it said nothing.
 * Keyed by that message's id.
 */
export const failureAnchors = (messages: ChannelPublicMessage[], entries: ReplyEntry[]) => {
  const anchors = new Map<string, ReplyEntry[]>();
  for (const entry of entries) {
    const { job } = entry;
    const answer = messages.findLast(
      (message) =>
        message.replyToId === job.messageId &&
        (message.author.id === job.memberId ||
          (!!entry.agentId && message.agentId === entry.agentId)),
    );
    const anchor = answer?.id ?? job.messageId;
    anchors.set(anchor, [...(anchors.get(anchor) ?? []), entry]);
  }
  return anchors;
};

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
        <Flexbox horizontal align="center" gap={4} style={{ marginInlineStart: 'auto' }}>
          {/* The member who runs the reply can watch it work in its topic on LobeHub. */}
          {agentId && job.topicId && (
            <ActionIcon
              aria-label={t('receipt.openTopic')}
              icon={ExternalLink}
              size="small"
              title={t('receipt.openTopic')}
              onClick={() => {
                close();
                openInWebApp(AGENT_CHAT_TOPIC_URL(agentId, job.topicId!));
              }}
            />
          )}
          {job.canStop && isChannelJobActive(job) && (
            <Button
              danger
              icon={Square}
              loading={stopping}
              size="small"
              style={{ flexShrink: 0 }}
              type="text"
              onClick={() => void stop()}
            >
              {t('stopReply')}
            </Button>
          )}
        </Flexbox>
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
      {/* "Agent unavailable" alone does not say why: name the device when it is the cause. */}
      {job.status === 'queued' && job.blockedCode === 'unavailable' && (
        <BlockedDevice
          restrictedOnly
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
