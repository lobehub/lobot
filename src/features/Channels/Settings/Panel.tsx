import { Flexbox, Tabs } from '@lobehub/ui';
import type { ChannelListItem } from '@lobot/types';
import * as stylex from '@stylexjs/stylex';
import { useTranslation } from 'react-i18next';

import { ChannelSidePanel } from '../MemberPanel';
import { DangerSection } from './DangerSection';
import { GeneralSection } from './GeneralSection';
import { ProjectSection } from './ProjectSection';
import { ReplySection } from './ReplySection';
import { settingsStyles } from './styles';
import { channelSettingsTabs, resolveChannelSettingsTab } from './tabs';

/** Everything an admin manages about a group Channel, beside its feed like the roster. */
export function ChannelSettingsPanel({
  availableWidth,
  channel,
  id,
  onClose,
  onTabChange,
  tab: requestedTab,
}: {
  availableWidth?: number;
  channel: ChannelListItem;
  id: string;
  onClose: () => void;
  onTabChange: (tab: string) => void;
  tab: string | null;
}) {
  const { t } = useTranslation('channel');
  const tabs = channelSettingsTabs(channel.status === 'archived', !!channel.projectId);
  const tab = resolveChannelSettingsTab(requestedTab, tabs);

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
        <Flexbox gap={16} {...stylex.props(settingsStyles.content)}>
          <Tabs
            activeKey={tab}
            items={tabs.map((key) => ({ key, label: t(`settings.tab.${key}`) }))}
            size="small"
            variant="square"
            onChange={onTabChange}
          />
          {/* Kept mounted so switching tabs does not discard a draft. */}
          <div hidden={tab !== 'general'} key={`general:${channel.id}`}>
            <GeneralSection channel={channel} />
          </div>
          {channel.projectId && (
            <div hidden={tab !== 'project'}>
              <ProjectSection projectId={channel.projectId} />
            </div>
          )}
          {tabs.includes('reply') && (
            <div hidden={tab !== 'reply'} key={`reply:${channel.id}`}>
              <ReplySection channelId={channel.id} />
            </div>
          )}
          <div hidden={tab !== 'advanced'}>
            <Flexbox gap={16}>
              <DangerSection channel={channel} />
            </Flexbox>
          </div>
        </Flexbox>
      </div>
    </ChannelSidePanel>
  );
}
