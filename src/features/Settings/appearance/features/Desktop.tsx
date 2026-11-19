'use client';

import { isDesktop } from '@lobechat/const';
import { Switch } from '@lobehub/ui';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useElectronStore } from '@/store/electron';

/** The tray / menu-bar icon switch; desktop only. */
const AppTraySwitch = () => {
  const { t } = useTranslation('setting');
  const [loading, setLoading] = useState(false);
  const [appTrayVisible, setAppTrayVisible, useGetAppTrayVisible] = useElectronStore((s) => [
    s.appTrayVisible,
    s.setAppTrayVisible,
    s.useGetAppTrayVisible,
  ]);

  useGetAppTrayVisible(isDesktop);

  return (
    <Switch
      aria-label={t('settingAppearance.appTray.title')}
      checked={appTrayVisible}
      loading={loading}
      onChange={async (checked: boolean) => {
        setLoading(true);
        try {
          await setAppTrayVisible(checked);
        } finally {
          setLoading(false);
        }
      }}
    />
  );
};

export default AppTraySwitch;
