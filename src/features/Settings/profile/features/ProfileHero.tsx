'use client';

import { Form } from '@lobehub/ui/form';
import { useTranslation } from 'react-i18next';

import { SettingsSearchAnchor } from '@/features/SettingsSearch/anchor';

import AvatarUpload from './AvatarUpload';
import FullNameInput from './FullNameInput';

/** Avatar and full name as one official Form.Field, with the hint under the label. */
const ProfileHero = () => {
  const { t } = useTranslation('auth');

  return (
    <Form.Field
      desc={t('profile.nameHint')}
      minWidth={undefined}
      avatar={
        <SettingsSearchAnchor id={'profile-avatar'}>
          <AvatarUpload />
        </SettingsSearchAnchor>
      }
      label={
        <SettingsSearchAnchor id={'profile-full-name'}>
          {t('profile.fullName')}
        </SettingsSearchAnchor>
      }
    >
      <FullNameInput />
    </Form.Field>
  );
};

export default ProfileHero;
