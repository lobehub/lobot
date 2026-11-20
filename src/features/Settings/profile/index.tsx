'use client';

import { Flexbox } from '@lobehub/ui';
import { useTranslation } from 'react-i18next';

import ProfileSkeleton from '@/components/Skeleton/Settings/tabs/Profile';
import Appearance from '@/features/Settings/appearance';
import SettingHeader from '@/features/Settings/features/SettingHeader';
import { useUserStore } from '@/store/user';
import { userProfileSelectors } from '@/store/user/selectors';

import AccountCard from './features/AccountCard';

interface ProfileSettingProps {
  showSettingHeader?: boolean;
}

const ProfileSetting = ({ showSettingHeader = true }: ProfileSettingProps) => {
  const [userProfile, isUserLoaded] = useUserStore((s) => [
    userProfileSelectors.userProfile(s),
    s.isLoaded,
  ]);
  // A profile already in the store paints immediately. The skeleton is only the
  // first moment before auth has resolved and there is no user to show.
  const isLoading = !isUserLoaded && !userProfile;

  const { t } = useTranslation('auth');

  if (isLoading)
    return (
      <>
        {showSettingHeader && <SettingHeader title={t('profile.title')} />}
        <ProfileSkeleton.Body />
      </>
    );

  return (
    <>
      {showSettingHeader && <SettingHeader title={t('profile.title')} />}
      <Flexbox gap={20}>
        <AccountCard />
        <Appearance showSettingHeader={false} />
      </Flexbox>
    </>
  );
};

export default ProfileSetting;
