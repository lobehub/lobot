import { Flexbox } from '@lobehub/ui';
import type { ChannelListItem } from '@lobot/types';
import * as stylex from '@stylexjs/stylex';
import { useTranslation } from 'react-i18next';

import { ChannelSidePanel } from '../MemberPanel';
import { DangerSection } from './DangerSection';
import { GeneralSection } from './GeneralSection';
import { ProjectSection } from './ProjectSection';
import { ReplySection } from './ReplySection';
import { settingsStyles } from './styles';

const CHANNEL_SETTINGS_MIN_WIDTH = 320;

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
      centeredTitle
      availableWidth={availableWidth}
      closeLabel={t('settings.close')}
      id={id}
      label={t('settings.title')}
      minWidth={CHANNEL_SETTINGS_MIN_WIDTH}
      title={t('settings.title')}
      onClose={onClose}
    >
      <div {...stylex.props(settingsStyles.scroll)}>
        <Flexbox gap={24} {...stylex.props(settingsStyles.content)}>
          <GeneralSection channel={channel} key={channel.id} />
          {channel.projectId && <ProjectSection projectId={channel.projectId} />}
          {channel.status !== 'archived' && (
            <ReplySection channelId={channel.id} key={channel.id} />
          )}
          <DangerSection channel={channel} />
        </Flexbox>
      </div>
    </ChannelSidePanel>
  );
}
