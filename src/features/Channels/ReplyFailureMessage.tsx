import { AGENT_CHAT_TOPIC_URL } from '@lobechat/const';
import { Button, Flexbox, Text } from '@lobehub/ui';
import type { ChannelDetail } from '@lobot/types';
import * as stylex from '@stylexjs/stylex';
import { ExternalLink, RotateCw } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import AgentAvatar from '@/components/AgentAvatar';
import AsyncError from '@/components/AsyncError';
import { ChatItem } from '@/features/Conversation/ChatItem';
import { openInWebApp } from '@/features/Electron/navigation/webApp';
import { channelActions } from '@/store/channel';

import { BlockedDevice } from './BlockedDevice';
import { canManageAgents } from './channelAccess';
import { ChannelStatus } from './ChannelStatus';
import { isDeviceFailure } from './jobStatus';
import type { ReplyEntry } from './MessageReceipts';
import { styles } from './styles';

const AVATAR_SIZE = 36;

/**
 * A reply that failed, posted in the feed by the Agent that owed it, right under the message it
 * answers: why it failed and a way to try again. It leaves once a newer reply settles it.
 */
export function ReplyFailureMessage({
  detail,
  entry: { agentId, avatar, job, member, name },
}: {
  detail: ChannelDetail;
  entry: ReplyEntry;
}) {
  const { t } = useTranslation('channel');
  const channelId = detail.channel.id;
  const deviceFailure = isDeviceFailure(job);
  const [retrying, setRetrying] = useState(false);
  const [error, setError] = useState<unknown>();
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
      icon={RotateCw}
      loading={retrying}
      size="small"
      style={{ flexShrink: 0 }}
      onClick={() => void retry()}
    >
      {t('receipt.retry')}
    </Button>
  );
  const openTopic = agentId && job.topicId && (
    <Button
      icon={ExternalLink}
      size="small"
      type="text"
      onClick={() => openInWebApp(AGENT_CHAT_TOPIC_URL(agentId, job.topicId!))}
    >
      {t('receipt.openTopic')}
    </Button>
  );

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
          <Flexbox gap={8} {...stylex.props(styles.replyFailureCard)}>
            <Text style={{ overflowWrap: 'anywhere', whiteSpace: 'pre-wrap' }} type="secondary">
              {/* A known cause reads in the viewer's language; others keep the server's diagnostic. */}
              {deviceFailure
                ? t('receipt.deviceUnreachable')
                : job.errorMessage?.trim() || t('receipt.errorUnavailable')}
            </Text>
            {deviceFailure ? (
              <BlockedDevice
                channelId={channelId}
                deviceId={job.deviceId}
                manageable={canManageAgents(detail.channel)}
                member={member}
                retry={retryButton || undefined}
              />
            ) : (
              (retryButton || openTopic) && (
                <Flexbox horizontal align="center" gap={8}>
                  {retryButton}
                  {openTopic}
                </Flexbox>
              )
            )}
            {error !== undefined && <AsyncError error={error} variant="inline" />}
          </Flexbox>
        }
      />
    </div>
  );
}
