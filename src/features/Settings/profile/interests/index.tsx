'use client';

import { useForm } from '@lobehub/ui/form';
import { useTranslation } from 'react-i18next';

import { FORM_STYLE } from '@/const/layoutTokens';
import SettingsForm from '@/features/Settings/features/SettingsForm';
import { SettingsTabs } from '@/store/global/initialState';

import SubPageFrame from '../../features/inset/SubPageFrame';
import InterestsPicker from './InterestsPicker';

/** The interests picker on its own page; each toggle saves, so Back is all it needs. */
const InterestsPage = () => {
  const { t } = useTranslation('auth');
  const form = useForm();

  return (
    <SubPageFrame tab={SettingsTabs.Profile} title={t('profile.interests')}>
      <SettingsForm
        collapsible={false}
        form={form}
        itemsType={'group'}
        variant={'borderless'}
        items={[
          {
            children: [
              {
                children: <InterestsPicker />,
                desc: t('profile.interestsHint'),
                label: t('profile.interests'),
                layout: 'vertical',
                minWidth: undefined,
              },
            ],
            title: null,
          },
        ]}
        {...FORM_STYLE}
      />
    </SubPageFrame>
  );
};

export default InterestsPage;
