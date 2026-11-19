'use client';

import { isDesktop } from '@lobechat/const';
import { Button, Switch } from '@lobehub/ui';
import { type FormGroupItem, useForm } from '@lobehub/ui/form';
import { FolderOpen } from 'lucide-react';
import { memo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { FORM_STYLE } from '@/const/layoutTokens';
import SettingsForm from '@/features/Settings/features/SettingsForm';
import { SettingsSearchAnchor } from '@/features/SettingsSearch/anchor';
import { desktopSettingsService } from '@/services/electron/settings';
import { useElectronStore } from '@/store/electron';
import { electronSettingsSelectors } from '@/store/electron/selectors';

import { useRemoteDebuggingItem } from './useRemoteDebuggingItem';

/**
 * Desktop-only: packaged builds record `info` and above by default; this switch
 * adds `debug` records while a user reproduces a bug. Dev builds always record
 * `debug`, so the switch shows on and locked there.
 */
const DebugLogs = memo(() => {
  const { t } = useTranslation('setting');
  const [updating, setUpdating] = useState(false);
  const form = useForm();
  const remoteDebuggingItem = useRemoteDebuggingItem();

  const [useFetchDebugLoggingSettings, setDebugLoggingEnabled] = useElectronStore((s) => [
    s.useFetchDebugLoggingSettings,
    s.setDebugLoggingEnabled,
  ]);
  useFetchDebugLoggingSettings();
  const data = useElectronStore(electronSettingsSelectors.debugLoggingSettings);

  if (!isDesktop) return null;

  const items: FormGroupItem = {
    children: [
      {
        children: (
          <Switch
            checked={data ? data.alwaysOn || data.enabled : false}
            disabled={!data || data.alwaysOn}
            loading={updating}
            onChange={async (checked: boolean) => {
              setUpdating(true);
              try {
                await setDebugLoggingEnabled(checked);
              } finally {
                setUpdating(false);
              }
            }}
          />
        ),
        desc: data?.alwaysOn
          ? t('settingAbout.debugLogs.devDesc')
          : t('settingAbout.debugLogs.desc'),
        label: (
          <SettingsSearchAnchor id={'about-debug-logs'}>
            {t('settingAbout.debugLogs.title')}
          </SettingsSearchAnchor>
        ),
        minWidth: undefined,
      },
      {
        children: (
          <Button
            icon={FolderOpen}
            type="fill"
            onClick={() => desktopSettingsService.openLogDirectory()}
          >
            {t('settingAbout.debugLogs.openDirectory')}
          </Button>
        ),
        desc: t('settingAbout.debugLogs.openDirectoryDesc'),
        label: t('settingAbout.debugLogs.directory'),
        minWidth: undefined,
      },
      ...(remoteDebuggingItem ? [remoteDebuggingItem] : []),
    ],
    title: t('settingAbout.diagnostics.title'),
  };

  return (
    <SettingsForm
      collapsible={false}
      form={form}
      items={[items]}
      itemsType={'group'}
      variant={'borderless'}
      {...FORM_STYLE}
    />
  );
});

export default DebugLogs;
