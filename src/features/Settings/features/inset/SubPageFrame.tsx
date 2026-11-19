'use client';

import { Flexbox, Text } from '@lobehub/ui';
import { type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import NavHeader from '@/features/NavHeader';
import BackButton from '@/features/NavPanel/components/BackButton';
import { useSettingsPopupStore } from '@/features/NavRail/settingsPopupStore';
import SettingContainer from '@/features/Setting/SettingContainer';
import { getSettingsContainerMaxWidth } from '@/features/Settings/features/ownFrameTabs';
import type { SettingsTabs } from '@/store/global/initialState';

export const settingsTabUrl = (tab: SettingsTabs) => `/settings/${tab}`;

interface SubPageFrameProps {
  children: ReactNode;
  /** Header action, e.g. Save */
  right?: ReactNode;
  /** The tab this page belongs to; the back button returns there */
  tab: SettingsTabs;
  title: ReactNode;
}

/**
 * A second-level settings page: back button and title together on the left,
 * optional actions on the right, and the body in the tab's inset column.
 */
const SubPageFrame = ({ children, right, tab, title }: SubPageFrameProps) => {
  const { t } = useTranslation('common');
  const settingsOpen = useSettingsPopupStore((s) => s.open);
  const closeSubPage = useSettingsPopupStore((s) => s.closeSubPage);

  return (
    <>
      <NavHeader
        right={right}
        showTogglePanelButton={false}
        left={
          <Flexbox horizontal align={'center'} gap={4}>
            <BackButton
              title={t('back')}
              to={settingsTabUrl(tab)}
              onClick={(event) => {
                if (!settingsOpen) return;
                event.preventDefault();
                closeSubPage();
              }}
            />
            <Text weight={500}>{title}</Text>
          </Flexbox>
        }
      />
      <SettingContainer
        maxWidth={getSettingsContainerMaxWidth(tab)}
        paddingBlock={'24px 128px'}
        paddingInline={24}
        style={{ background: 'transparent' }}
      >
        {children}
      </SettingContainer>
    </>
  );
};

export default SubPageFrame;
