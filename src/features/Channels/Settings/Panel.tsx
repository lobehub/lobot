import { Flexbox, Text } from '@lobehub/ui';
import type { ChannelListItem } from '@lobot/types';
import * as stylex from '@stylexjs/stylex';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { ChannelSidePanel } from '../MemberPanel';
import { DangerSection } from './DangerSection';
import { GeneralSection } from './GeneralSection';
import { ProjectSection } from './ProjectSection';
import { ReplySection } from './ReplySection';
import { settingsStyles } from './styles';

function Group({ children, title }: { children: ReactNode; title: string }) {
  return (
    <Flexbox gap={8}>
      <Text fontSize={12} type="secondary" weight={500}>
        {title}
      </Text>
      {children}
    </Flexbox>
  );
}

/**
 * Everything an admin manages about a group Channel, beside its feed like the roster, laid out
 * in one scroll. An archived Channel takes no writes until it is reopened, so it shows no reply
 * settings; only a Channel that belongs to a project shows that project.
 */
export function ChannelSettingsPanel({
  availableWidth,
  channel,
  id,
  onClose,
}: {
  availableWidth?: number;
  channel: ChannelListItem;
  id: string;
  onClose: () => void;
}) {
  const { t } = useTranslation('channel');

  return (
    <ChannelSidePanel
      availableWidth={availableWidth}
      closeLabel={t('settings.close')}
      id={id}
      label={t('settings.title')}
      title={t('settings.title')}
      onClose={onClose}
    >
      <div {...stylex.props(settingsStyles.scroll)}>
        <Flexbox gap={24} {...stylex.props(settingsStyles.content)}>
          <Group title={t('settings.tab.general')}>
            <GeneralSection channel={channel} />
          </Group>
          {channel.projectId && (
            <Group title={t('settings.tab.project')}>
              <ProjectSection projectId={channel.projectId} />
            </Group>
          )}
          {channel.status !== 'archived' && (
            <Group title={t('settings.tab.reply')}>
              <ReplySection channelId={channel.id} />
            </Group>
          )}
          <Group title={t('settings.tab.advanced')}>
            <DangerSection channel={channel} />
          </Group>
        </Flexbox>
      </div>
    </ChannelSidePanel>
  );
}
