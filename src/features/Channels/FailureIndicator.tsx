import { ActionIcon, Button, Flexbox, Icon, Popover, Text, usePopoverContext } from '@lobehub/ui';
import type { ChannelDetail } from '@lobot/types';
import * as stylex from '@stylexjs/stylex';
import { BotX, LocateFixed } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { canManageAgents } from './channelAccess';
import { mainTimelineFailures } from './jobStatus';
import type { ReplyEntry } from './MessageReceipts';
import { ReplyDetail, replyEntries } from './MessageReceipts';
import { REPLY_POPUP_PROPS } from './replyPopup';
import { markFailureSeen, useUnseenFailures } from './seenFailures';
import { statusStyles } from './styles';

/** Scrolls the main conversation to a message, if it is in the loaded page. */
const findMessage = (messageId: string) =>
  document.querySelector<HTMLElement>(
    `[data-channel-conversation="main"] [data-message-id="${CSS.escape(messageId)}"]`,
  );

function FailureRow({
  channelId,
  entry,
  manageable,
}: {
  channelId: string;
  entry: ReplyEntry;
  manageable: boolean;
}) {
  const { t } = useTranslation('channel');
  const { close } = usePopoverContext();
  return (
    <ReplyDetail
      hideState
      channelId={channelId}
      entry={entry}
      manageable={manageable}
      trailing={
        <ActionIcon
          aria-label={t('failure.locate')}
          icon={LocateFixed}
          size="small"
          title={t('failure.locate')}
          onClick={() => {
            close();
            const message = findMessage(entry.job.messageId);
            if (!message) return;
            message.scrollIntoView({ behavior: 'smooth', block: 'center' });
            // Looked at, it stops nudging from the header; the failure stays in the conversation.
            markFailureSeen(entry.job.id);
          }}
        />
      }
    />
  );
}

/**
 * Replies that failed and were not settled by a newer reply from the same Agent. Lives in
 * the header so the timeline stays readable; each message keeps a small marker. A failure the
 * person jumped to leaves the header. The trigger is a lone amber glyph: the count is in its
 * label and the popover's title, not beside the icon.
 */
export function FailureIndicator({ detail }: { detail: ChannelDetail }) {
  const { t } = useTranslation('channel');
  const failures = useUnseenFailures(mainTimelineFailures(detail.jobs));
  if (!failures.length) return null;
  const entries = replyEntries(detail, failures, t('unnamedAgent'));
  const label = t('failure.title', { count: failures.length });

  return (
    <Popover
      placement="bottomRight"
      popupProps={REPLY_POPUP_PROPS}
      trigger="click"
      content={
        <Flexbox gap={16} {...stylex.props(statusStyles.popover, statusStyles.replyList)}>
          <Text fontSize={12} type="secondary" weight={500}>
            {label}
          </Text>
          {entries.map((entry) => (
            <FailureRow
              channelId={detail.channel.id}
              entry={entry}
              key={entry.job.id}
              manageable={canManageAgents(detail.channel)}
            />
          ))}
        </Flexbox>
      }
    >
      <Button
        aria-label={label}
        size="small"
        title={label}
        type="text"
        {...stylex.props(statusStyles.failureButton)}
      >
        <Icon icon={BotX} size={16} />
      </Button>
    </Popover>
  );
}
