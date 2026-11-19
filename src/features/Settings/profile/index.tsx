'use client';

import { Form, useForm } from '@lobehub/ui/form';
import { useTranslation } from 'react-i18next';

import ProfileSkeleton from '@/components/Skeleton/Settings/tabs/Profile';
import { FORM_STYLE } from '@/const/layoutTokens';
import SettingHeader from '@/features/Settings/features/SettingHeader';
import { SettingsSurfaceGroup } from '@/features/Settings/features/SettingsForm';
import { useUserStore } from '@/store/user';
import { authSelectors, userProfileSelectors } from '@/store/user/selectors';

import EmailRow from './features/EmailRow';
import InterestsRow from './features/InterestsRow';
import ProfileHero from './features/ProfileHero';
import SignOutRow from './features/SignOutRow';
import UsernameRow from './features/UsernameRow';

interface ProfileSettingProps {
  showSettingHeader?: boolean;
}

const ProfileSetting = ({ showSettingHeader = true }: ProfileSettingProps) => {
  const isLogin = useUserStore(authSelectors.isLogin);
  const [userProfile, isUserLoaded] = useUserStore((s) => [
    userProfileSelectors.userProfile(s),
    s.isLoaded,
  ]);
  // A profile already in the store paints immediately. The skeleton is only the
  // first moment before auth has resolved and there is no user to show.
  const isLoading = !isUserLoaded && !userProfile;
  const form = useForm();

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
      <Form form={form} gap={20} variant={'borderless'} {...FORM_STYLE} itemMinWidth={undefined}>
        <SettingsSurfaceGroup>
          <ProfileHero />
        </SettingsSurfaceGroup>
        <SettingsSurfaceGroup>
          <InterestsRow />
        </SettingsSurfaceGroup>
        <SettingsSurfaceGroup>
          <UsernameRow />
          {isLogin && userProfile?.email && <EmailRow />}
        </SettingsSurfaceGroup>
        {/* Sign out is an action, not a form field, so it stays out of Form.Field. */}
        {isLogin && (
          <SettingsSurfaceGroup>
            <SignOutRow />
          </SettingsSurfaceGroup>
        )}
      </Form>
    </>
  );
};

export default ProfileSetting;
