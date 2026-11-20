import { Button, Flexbox } from '@lobehub/ui';
import type { ChannelDetail } from '@lobot/types';
import * as stylex from '@stylexjs/stylex';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import AgentAvatar from '@/components/AgentAvatar';
import AsyncError from '@/components/AsyncError';
import { ChatItem } from '@/features/Conversation/ChatItem';
import { channelActions } from '@/store/channel';

import { ChannelStatus } from './ChannelStatus';
import { isDeviceFailure, isQuotaFailure } from './jobStatus';
import type { ReplyEntry } from './MessageReceipts';
import { styles } from './styles';

const AVATAR_SIZE = 36;

/**
 * A reply that failed, posted in the feed by the Agent that owed it, after what it already said
 * about the request: the reason on one line, and under it a retry button. It leaves once a newer
 * reply settles it.
 * A spent subscription offers no retry, which would only hit the limit again, but a handoff to
 * another Agent.
 */
export function ReplyFailureMessage({
  detail,
  entry: { agentId, avatar, job, name },
  onHandoff,
}: {
  detail: ChannelDetail;
  entry: ReplyEntry;
  onHandoff?: () => void;
}) {
  const { t } = useTranslation('channel');
  const [retrying, setRetrying] = useState(false);
  const [error, setError] = useState<unknown>();
  // A known cause reads in the viewer's language; others keep the server's diagnostic.
  const reason = isDeviceFailure(job)
    ? t('receipt.deviceUnreachable')
    : job.errorMessage?.trim() || t('receipt.errorUnavailable');
  const quotaFailure = isQuotaFailure(job);
  const retry = async () => {
    setRetrying(true);
    setError(undefined);
    try {
      await channelActions.retryJob(detail.channel.id, job);
    } catch (cause) {
      console.error('Failed to retry Channel reply', cause);
      setError(cause);
    } finally {
      setRetrying(false);
    }
  };

  return (
    <div
      aria-label={t('failure.messageLabel', { names: name })}
      data-reply-failure={job.id}
      role="article"
      {...stylex.props(styles.messageRow)}
    >
      <ChatItem
        quietHeader
        showAvatar
        showTitle
        agentId={agentId ?? undefined}
        avatar={{ avatar, title: name }}
        avatarProps={{ shape: 'circle', size: AVATAR_SIZE }}
        gap={4}
        id={job.id}
        paddingBlock={8}
        placement="left"
        style={{ paddingInlineStart: 48 }}
        titleAddon={<ChannelStatus label={t('status.failed')} tone="error" />}
        customAvatarRender={() => (
          <Flexbox {...stylex.props(styles.messageAvatar)}>
            <AgentAvatar
              agentId={agentId}
              avatar={avatar}
              name={name}
              shape={'circle'}
              size={AVATAR_SIZE}
            />
          </Flexbox>
        )}
        message={
          <>
            <div {...stylex.props(styles.replyFailure)}>
              <span title={reason} {...stylex.props(styles.replyFailureReason)}>
                {reason}
              </span>
            </div>
            {quotaFailure
              ? onHandoff && (
                  <Button
                    shape="round"
                    size="small"
                    type="fill"
                    {...stylex.props(styles.replyFailureAction)}
                    onClick={onHandoff}
                  >
                    {t('receipt.handoff')}
                  </Button>
                )
              : /* Whoever may stop a reply may retry it. A failed run still being released cannot. */
                job.canStop &&
                !job.writerHeld && (
                  <Button
                    loading={retrying}
                    shape="round"
                    size="small"
                    type="fill"
                    {...stylex.props(styles.replyFailureAction)}
                    onClick={() => void retry()}
                  >
                    {t('receipt.retry')}
                  </Button>
                )}
            {error !== undefined && <AsyncError error={error} variant="inline" />}
          </>
        }
      />
    </div>
  );
}
