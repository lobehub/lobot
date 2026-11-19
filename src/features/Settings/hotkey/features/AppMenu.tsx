'use client';

import { HotkeyInput } from '@lobehub/ui';
import { type FormGroupItem, useForm } from '@lobehub/ui/form';
import { memo, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { AppMenuHotkeysSkeleton } from '@/components/Skeleton/Settings/tabs/Hotkey';
import { FORM_STYLE } from '@/const/layoutTokens';
import SettingsForm from '@/features/Settings/features/SettingsForm';
import { SettingsSearchAnchor } from '@/features/SettingsSearch/anchor';
import { useElectronStore } from '@/store/electron';
import { electronSettingsSelectors } from '@/store/electron/selectors';

import { collectAppMenuHotkeys } from './appMenuHotkeys';

/**
 * Read-only list of the desktop app menu accelerators (New Agent, New Topic, Zoom, …).
 * Reads the live Electron menu, so labels are localized and keys match the current platform.
 */
const AppMenuHotkeys = memo(() => {
  const { t } = useTranslation('setting');
  const form = useForm();
  const { error } = useElectronStore((s) => s.useFetchAppMenu)();
  const data = useElectronStore(electronSettingsSelectors.appMenu);

  const hotkeys = useMemo(() => collectAppMenuHotkeys(data ?? []), [data]);

  if (data === undefined && !error) return <AppMenuHotkeysSkeleton />;

  if (hotkeys.length === 0) return null;

  const appMenu: FormGroupItem = {
    children: hotkeys.map((item) => ({
      children: (
        <HotkeyInput disabled allowReset={false} resetValue={item.keys} value={item.keys} />
      ),
      label: item.label,
      tag: item.menu,
    })),
    desc: t('hotkey.group.appMenuDesc'),
    title: (
      <SettingsSearchAnchor id={'hotkey-app-menu'}>
        {t('hotkey.group.appMenu')}
      </SettingsSearchAnchor>
    ),
  };

  return (
    <SettingsForm
      collapsible={false}
      form={form}
      items={[appMenu]}
      itemsType={'group'}
      variant={'borderless'}
      {...FORM_STYLE}
    />
  );
});

AppMenuHotkeys.displayName = 'AppMenuHotkeys';

export default AppMenuHotkeys;
