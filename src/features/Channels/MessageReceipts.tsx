import { AGENT_CHAT_TOPIC_URL } from '@lobechat/const';
import { ActionIcon, Button, Flexbox, Popover, Text, usePopoverContext } from '@lobehub/ui';
import type {
  ChannelDetail,
  ChannelPublicJob,
  ChannelPublicMember,
  ChannelPublicMessage,
} from '@lobot/types';
import * as stylex from '@stylexjs/stylex';
import { ExternalLink } from 'lucide-react';
import type { ReactNode } from 'react';
import { useLayoutEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import AgentAvatar from '@/components/AgentAvatar';
import AsyncError from '@/components/AsyncError';
import { openInWebApp } from '@/features/Electron/navigation/webApp';
import { channelActions } from '@/store/channel';

import { BlockedDevice } from './BlockedDevice';
import { canManageAgents } from './channelAccess';
import { ChannelStatus } from './ChannelStatus';
import { isChannelJobActive, isDeviceFailure, isQuotaFailure } from './jobStatus';
import { memberAvatar, memberName } from './memberName';
import { statusStyles, styles } from './styles';
import { useOpenReplyAgent } from './useOpenReplyAgent';
import { useReplyStatusLabel } from './useReplyStatusLabel';

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
 * The name column, when several Agents are listed, is as wide as the widest name, up to this cap;
 * a longer name ends in an ellipsis.
 */
const NAME_COLUMN_MAX = 120;
/** The column width the list measures, set on the list element. */
const NAME_COLUMN_VAR = '--reply-name-width';
const NAME_FREE = { flex: '0 1 auto', minWidth: 0 } as const;
const NAME_COLUMN = {
  flex: 'none',
  minWidth: 0,
  width: `var(${NAME_COLUMN_VAR}, auto)`,
} as const;

/**
 * The name column's width: the widest name's full width, capped. A name's full width is its box
 * plus whatever its text runs past the box (its ellipsis cut).
 */
export const nameColumnWidth = (names: { box: number; text: number; textBox: number }[]) =>
  Math.min(
    NAME_COLUMN_MAX,
    Math.ceil(Math.max(0, ...names.map((n) => n.box + n.text - n.textBox))),
  );
/** A state stays whole on the row; a topic's name in its place shrinks to an ellipsis instead. */
const STATE_WHOLE = { flexShrink: 0, whiteSpace: 'nowrap' } as const;
const STATE_SHRINK = { display: 'flex', flex: '0 1 auto', minWidth: 0 } as const;
/** The name button starts its text at the column's edge instead of centring it. */
const NAME_COLUMN_BUTTON = { ...NAME_COLUMN, justifyContent: 'flex-start' } as const;

/**
 * One reply: its state, why it failed or what device it waits for, and how to stop it or open
 * its Agent. `manageable` viewers (Channel admins) also see that device and can change it.
 * `queue` holds the replies listed beside it, so one waiting behind an earlier reply of the same
 * Agent says so instead of typing. `nameColumn` puts the name in the list's name column, as wide as
 * the widest name (a too-long one ends in an ellipsis), so the states line up in one column.
 * `hideState` drops the state where the list's title already says it (every reply failed);
 * `trailing` is an always-visible action at the end of the name row.
 */
export function ReplyDetail({
  channelId,
  entry: { agentId, avatar, job, member, name },
  hideState,
  manageable,
  nameColumn,
  queue,
  trailing,
}: {
  channelId: string;
  entry: ReplyEntry;
  hideState?: boolean;
  manageable?: boolean;
  nameColumn?: boolean;
  queue?: ChannelPublicJob[];
  trailing?: ReactNode;
}) {
  const { t } = useTranslation('channel');
  const status = useReplyStatusLabel(job, queue ?? [job]);
  const topicTitle = job.topicId ? job.topicTitle?.trim() : undefined;
  // A reply at work says what it works on: its topic's name, when the viewer runs it, stands in
  // for the generic "working". Any other state keeps its label and names the topic below.
  const topicAsState = !!topicTitle && status.tone === 'working';
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
  // Whoever may stop a reply may retry it. A failed run still being released cannot start again,
  // nor can one whose subscription is spent: it would only hit the same limit.
  const retryButton = job.canStop && !job.writerHeld && !isQuotaFailure(job) && (
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
    <Flexbox gap={8} {...stylex.props(stylex.defaultMarker())}>
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
            opens the Agent without an icon. Alone it keeps its own width and only shrinks (to an
            ellipsis) when the row runs out; in a list it takes the name column's width. */}
        {agentId ? (
          <Button
            aria-label={t('openAgentNamed', { name })}
            data-reply-name={nameColumn || undefined}
            outdent="start"
            size="small"
            style={nameColumn ? NAME_COLUMN_BUTTON : NAME_FREE}
            title={t('openAgentNamed', { name })}
            type="text"
            onClick={openAgent}
          >
            <Text
              ellipsis
              as="span"
              data-reply-name-text={nameColumn || undefined}
              style={{ minWidth: 0 }}
              weight={500}
            >
              {name}
            </Text>
          </Button>
        ) : (
          <Text
            ellipsis
            data-reply-name={nameColumn || undefined}
            data-reply-name-text={nameColumn || undefined}
            style={nameColumn ? NAME_COLUMN : NAME_FREE}
            weight={500}
          >
            {name}
          </Text>
        )}
        {/* The state stays whole on the row and the name gives way first; a topic's name in the
            state's place shrinks with it. */}
        {!hideState && (
          <span style={topicAsState ? STATE_SHRINK : STATE_WHOLE}>
            <ChannelStatus
              ellipsis={topicAsState}
              label={topicAsState ? topicTitle! : status.label}
              tone={status.tone}
            />
          </span>
        )}
        <Flexbox
          horizontal
          align="center"
          gap={4}
          {...stylex.props(statusStyles.replyActions, stopping && statusStyles.replyActionsBusy)}
        >
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
              loading={stopping}
              size="small"
              style={{ flexShrink: 0 }}
              type="fill"
              onClick={() => void stop()}
            >
              {t('stopReply')}
            </Button>
          )}
        </Flexbox>
        {trailing}
      </Flexbox>
      {/* The topic the reply runs in, by name, so replies of one Agent tell apart at a glance.
          Only its runner gets it, as with the open-topic action. */}
      {topicTitle && !topicAsState && (
        <Text
          ellipsis
          fontSize={12}
          title={topicTitle}
          type="secondary"
          {...stylex.props(statusStyles.replyIndent)}
        >
          {topicTitle}
        </Text>
      )}
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
      {/* The reason sits under the name, in the quiet colour: the state already says it failed. */}
      {job.status === 'failed' && (
        <Text
          data-reply-reason
          type="secondary"
          {...stylex.props(statusStyles.replyIndent, statusStyles.replyReason)}
        >
          {/* A known cause reads in the viewer's language; others keep the server's diagnostic. */}
          {deviceFailure
            ? t('receipt.deviceUnreachable')
            : job.errorMessage?.trim() || t('receipt.errorUnavailable')}
        </Text>
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

/**
 * Replies grouped by the member that runs them, in the order each member first appears. Within a
 * group the replies keep their order.
 */
export const groupReplyEntries = (entries: ReplyEntry[]): ReplyEntry[][] => {
  const groups = new Map<string, ReplyEntry[]>();
  for (const entry of entries) {
    const key = entry.job.memberId;
    groups.set(key, [...(groups.get(key) ?? []), entry]);
  }
  return [...groups.values()];
};

/**
 * Replies as popover content, one group per Agent so its replies sit together. Every row keeps its
 * avatar and name, so the rows line up whatever Agent they belong to.
 */
export function ReplyList({
  channelId,
  entries,
  manageable,
}: {
  channelId: string;
  entries: ReplyEntry[];
  manageable?: boolean;
}) {
  // The queue keeps the jobs' own order (newest first): a reply's place in it says what it waits on.
  const queue = entries.map((entry) => entry.job);
  // With replies of more than one Agent the names take one width, so the states line up down the
  // list. One Agent's replies already share a name, so it keeps its own width.
  const nameColumn = new Set(entries.map((entry) => entry.job.memberId)).size > 1;
  const listRef = useRef<HTMLElement>(null);
  const namesKey = nameColumn ? entries.map((entry) => entry.name).join('\n') : '';
  // Size the column to the widest name: measure every name at its own width, then set the column.
  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list) return;
    list.style.removeProperty(NAME_COLUMN_VAR);
    if (!namesKey) return;
    const names = [...list.querySelectorAll<HTMLElement>('[data-reply-name]')].map((box) => {
      const text = box.matches('[data-reply-name-text]')
        ? box
        : box.querySelector<HTMLElement>('[data-reply-name-text]');
      return {
        box: box.getBoundingClientRect().width,
        text: text?.scrollWidth ?? 0,
        textBox: text?.clientWidth ?? 0,
      };
    });
    const width = nameColumnWidth(names);
    // Measured before it laid out (hidden), it would collapse every name: keep their own widths.
    if (width > 0) list.style.setProperty(NAME_COLUMN_VAR, `${width}px`);
  }, [namesKey]);
  return (
    <Flexbox gap={16} ref={listRef} {...stylex.props(statusStyles.popover, statusStyles.replyList)}>
      {groupReplyEntries(entries).map((group) => (
        <Flexbox gap={8} key={group[0].job.id}>
          {group.map((entry) => (
            <ReplyDetail
              channelId={channelId}
              entry={entry}
              key={entry.job.id}
              manageable={manageable}
              nameColumn={nameColumn}
              queue={queue}
            />
          ))}
        </Flexbox>
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
