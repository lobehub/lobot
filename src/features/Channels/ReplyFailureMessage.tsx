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
import { isDeviceFailure } from './jobStatus';
import type { ReplyEntry } from './MessageReceipts';
import { styles } from './styles';

const AVATAR_SIZE = 36;

/**
 * A reply that failed, posted in the feed by the Agent that owed it, after what it already said
 * about the request: the reason on one line, with a retry. It leaves once a newer reply settles it.
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
            </div>
            {error !== undefined && <AsyncError error={error} variant="inline" />}
          </>
        }
      />
    </div>
  );
}
