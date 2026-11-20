'use client';

import { Flexbox } from '@lobehub/ui';
import * as stylex from '@stylexjs/stylex';

import { SettingsSurfaceGroup } from '@/features/Settings/features/SettingsForm';

import SkeletonBar from '../Bar';
import AppearanceSkeleton from './tabs/Appearance';
import { useSkeletonText } from './useSkeletonText';

const styles = stylex.create({
  row: {
    display: 'flex',
    gap: '12px',
    alignItems: 'center',
    minHeight: '64px',
    paddingBlock: '4px',
  },
});

/**
 * The profile page: the account card, then the appearance groups that now
 * live under it. Same captions as the settled page.
 */
const SettingsProfileSkeleton = () => {
  const text = useSkeletonText('auth');

  return (
    <Flexbox aria-busy data-testid={'settings-profile-skeleton'} gap={20}>
      <SettingsSurfaceGroup title={text('profile.account', 32, 12)}>
        <div {...stylex.props(styles.row)}>
          <SkeletonBar height={40} radius={'50%'} width={40} />
          <Flexbox flex={1} gap={4}>
            <SkeletonBar height={14} width={96} />
            <SkeletonBar height={12} width={72} />
          </Flexbox>
          <SkeletonBar height={32} width={64} />
          <SkeletonBar height={32} width={72} />
        </div>
      </SettingsSurfaceGroup>
      <AppearanceSkeleton.Body />
    </Flexbox>
  );
};

export default SettingsProfileSkeleton;
