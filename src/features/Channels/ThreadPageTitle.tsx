import { ActionIcon, cssVar, DropdownMenu, Flexbox, Icon, Text } from '@lobehub/ui';
import type { ChannelDetail } from '@lobot/types';
import * as stylex from '@stylexjs/stylex';
import { ChevronDown, ChevronRight, Hash, MoreHorizontal } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { channelSelectors, useChannelStore } from '@/store/channel';

import { groupChannelName } from './channelName';
import { styles } from './styles';
import { threadIcon } from './threadIcon';
import { ThreadFollowers } from './ThreadPanel';
import { ThreadSwitchMenu } from './ThreadSwitcher';
import { threadTitle } from './threadTitle';
import { useChannelProjectName } from './useChannelProjectName';
import { useThreadMenu } from './useThreadMenu';

/**
 * The header of a thread opened as the page: `# Channel › thread`, the Channel leading back and
 * the thread switching to another thread of the Channel.
 */
export const ThreadPageTitle = ({
  detail,
  onBack,
  onSwitch,
  threadId,
}: {
  detail: ChannelDetail;
  onBack: () => void;
  onSwitch: (threadId: string) => void;
  threadId: string;
}) => {
  const { t } = useTranslation('channel');
  const channelId = detail.channel.id;
  const threadView = useChannelStore(channelSelectors.detail({ channelId, threadId }));
  const thread = detail.threads.find((entry) => entry.id === threadId);
  const title =
    threadTitle(
      threadView?.rootMessage ??
        detail.messages.find((message) => message.id === thread?.rootMessageId),
      thread,
    ) || t('thread');
  const projectName = useChannelProjectName(detail.channel.projectId);
  const channelTitle = groupChannelName(detail.channel, projectName) || t('title');

  return (
    <Flexbox horizontal align="center" gap={6} style={{ minWidth: 0 }}>
      <button type="button" {...stylex.props(styles.crumb)} onClick={onBack}>
        <Hash color={cssVar.colorTextDescription} size={16} />
        <Text ellipsis type="secondary">
          {channelTitle}
        </Text>
      </button>
      <Icon color={cssVar.colorTextDescription} icon={ChevronRight} size={14} />
      <ThreadSwitchMenu detail={detail} threadId={threadId} onOpen={onSwitch}>
        <button type="button" {...stylex.props(styles.crumb, styles.threadCrumb)}>
          <Icon icon={threadIcon} size={16} />
          <Text ellipsis title={title} weight={500}>
            {title}
          </Text>
          <Icon color={cssVar.colorTextDescription} icon={ChevronDown} size={14} />
        </button>
      </ThreadSwitchMenu>
    </Flexbox>
  );
};

/** Followers and the thread menu, as the side panel shows them. */
export const ThreadPageActions = ({
  detail,
  threadId,
}: {
  detail: ChannelDetail;
  threadId: string;
}) => {
  const { t } = useTranslation('channel');
  const threadMenu = useThreadMenu();
  const thread = detail.threads.find((entry) => entry.id === threadId);
  const menuItems = thread ? threadMenu(detail.channel, thread) : [];
  return (
    <Flexbox horizontal align="center" gap={8}>
      <ThreadFollowers detail={detail} target={threadId} />
      {menuItems.length > 0 && (
        <DropdownMenu items={menuItems}>
          <ActionIcon
            aria-label={t('more', { ns: 'common' })}
            icon={MoreHorizontal}
            size="small"
            title={t('more', { ns: 'common' })}
          />
        </DropdownMenu>
      )}
    </Flexbox>
  );
};
