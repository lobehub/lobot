import { Button } from '@lobehub/ui';
import type { ChannelDetail } from '@lobot/types';
import * as stylex from '@stylexjs/stylex';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import AgentAvatar from '@/components/AgentAvatar';
import AsyncError from '@/components/AsyncError';
import { channelActions } from '@/store/channel';

import { isDeviceFailure } from './jobStatus';
import type { ReplyEntry } from './MessageReceipts';
import { styles } from './styles';

/**
 * A reply that failed, as one system line after what the Agent already said about the request:
 * who failed, why, and a retry. It leaves once a newer reply settles it.
 */
export function ReplyFailureMessage({
  detail,
  entry: { agentId, avatar, job, name },
}: {
  detail: ChannelDetail;
  entry: ReplyEntry;
}) {
  const { t } = useTranslation('channel');
  const [retrying, setRetrying] = useState(false);
  const [error, setError] = useState<unknown>();
  // A known cause reads in the viewer's language; others keep the server's diagnostic.
  const reason = isDeviceFailure(job)
    ? t('receipt.deviceUnreachable')
    : job.errorMessage?.trim() || t('receipt.errorUnavailable');
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
      role="note"
      {...stylex.props(styles.event, styles.replyFailure)}
    >
      <AgentAvatar agentId={agentId} avatar={avatar} name={name} shape={'circle'} size={18} />
      <span {...stylex.props(styles.replyFailureName)}>{name}</span>
      <span {...stylex.props(styles.replyFailureState)}>{t('status.failed')}</span>
      <span title={reason} {...stylex.props(styles.replyFailureReason)}>
        {reason}
      </span>
      {/* Whoever may stop a reply may retry it. A failed run still being released cannot. */}
      {job.canStop && !job.writerHeld && (
        <Button
          loading={retrying}
          size="small"
          style={{ flexShrink: 0 }}
          type="link"
          onClick={() => void retry()}
        >
          {t('receipt.retry')}
        </Button>
      )}
      {error !== undefined && <AsyncError error={error} variant="inline" />}
    </div>
  );
}
