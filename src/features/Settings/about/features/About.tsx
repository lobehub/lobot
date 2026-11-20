'use client';

import { BRANDING_NAME } from '@lobechat/business-const';
import { Flexbox } from '@lobehub/ui';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';

import { SettingsSurfaceGroup } from '@/features/Settings/features/SettingsForm';

import Version from './Version';

const About = memo<{ mobile?: boolean }>(({ mobile }) => {
  const { t } = useTranslation('common');

  return (
    <SettingsSurfaceGroup
      style={{ maxWidth: '1024px', width: '100%' }}
      title={`${t('about')} ${BRANDING_NAME}`}
    >
      <Flexbox paddingBlock={20} width={'100%'}>
        <Version mobile={mobile} />
      </Flexbox>
    </SettingsSurfaceGroup>
  );
});

export default About;
