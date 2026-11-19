'use client';

import { Select } from '@lobehub/ui';
import { type FormGroupItem, useForm } from '@lobehub/ui/form';
import { memo, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { FORM_STYLE } from '@/const/layoutTokens';
import SettingsForm from '@/features/Settings/features/SettingsForm';
import { SettingsSearchAnchor } from '@/features/SettingsSearch/anchor';
import { autoUpdateService } from '@/services/electron/autoUpdate';

type UpdateChannelValue = 'canary' | 'stable';

/** Which release line this desktop app follows; lives next to the version it updates. */
const UpdateChannel = memo(() => {
  const { t } = useTranslation('setting');
  const form = useForm();
  const [channel, setChannel] = useState<UpdateChannelValue>('stable');

  useEffect(() => {
    autoUpdateService
      .getUpdateChannel()
      .then(setChannel)
      .catch(() => {});
  }, []);

  const changeChannel = (value: UpdateChannelValue) => {
    setChannel(value);
    autoUpdateService.setUpdateChannel(value);
  };

  const group: FormGroupItem = {
    children: [
      {
        children: (
          <Select
            value={channel}
            options={[
              { label: t('tab.advanced.updateChannel.stable'), value: 'stable' },
              { label: t('tab.advanced.updateChannel.canary'), value: 'canary' },
            ]}
            onChange={changeChannel}
          />
        ),
        desc: t('tab.advanced.updateChannel.desc'),
        label: (
          <SettingsSearchAnchor id={'about-update-channel'}>
            {t('tab.advanced.updateChannel.title')}
          </SettingsSearchAnchor>
        ),
      },
    ],
    title: t('tab.advanced.appUpdates.title'),
  };

  return (
    <SettingsForm
      collapsible={false}
      form={form}
      items={[group]}
      itemsType={'group'}
      variant={'borderless'}
      {...FORM_STYLE}
    />
  );
});

export default UpdateChannel;
