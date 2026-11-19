'use client';

import { Flexbox } from '@lobehub/ui';
import { cssVar } from '@lobehub/ui/stylex/cssVar.stylex';
import * as stylex from '@stylexjs/stylex';

import { FORM_STYLE } from '@/const/layoutTokens';
import { SettingsSurfaceGroup } from '@/features/Settings/features/SettingsForm';
import { useUserStore } from '@/store/user';
import { authSelectors, userProfileSelectors } from '@/store/user/selectors';

import SkeletonBar from '../Bar';
import { SettingsFormSkeleton } from './Section';
import { useSkeletonText } from './useSkeletonText';

const styles = stylex.create({
  hero: {
    display: 'flex',
    gap: '16px',
    alignItems: 'center',
    minHeight: '64px',
    paddingBlock: '16px',
  },
  signOut: {
    display: 'flex',
    alignItems: 'center',
    minHeight: '48px',
    color: cssVar.colorError,
  },
});

/**
 * The profile tab's form groups: same captions and row labels as the settled
 * page, with placeholders only for the user's values. Rows the settled page
 * shows conditionally (email, sign out) follow the same conditions.
 */
const SettingsProfileSkeleton = () => {
  const isLogin = useUserStore(authSelectors.isLogin);
  const email = useUserStore(userProfileSelectors.email);
  const text = useSkeletonText('auth');

  return (
    <Flexbox aria-busy data-testid={'settings-profile-skeleton'} gap={20}>
      <SettingsSurfaceGroup style={FORM_STYLE.style}>
        <div {...stylex.props(styles.hero)}>
          <SkeletonBar height={40} radius={'50%'} width={40} />
          <Flexbox flex={1} gap={4}>
            {text('profile.fullName', 64, 14)}
            {text('profile.nameHint', 240, 12)}
          </Flexbox>
          <SkeletonBar height={32} width={160} />
        </div>
      </SettingsSurfaceGroup>
      <SettingsFormSkeleton
        groups={[
          {
            items: [
              {
                control: { height: 22, width: 72 },
                desc: text('profile.interestsHint', 320, 12),
                label: text('profile.interests', 64, 14),
                minWidth: undefined,
              },
            ],
            title: null,
          },
          {
            items: [
              {
                control: { height: 22, width: 120 },
                label: text('profile.username', 64, 14),
                minWidth: undefined,
              },
              ...(isLogin && email
                ? [
                    {
                      control: { height: 22, width: 184 },
                      label: text('profile.email', 96, 14),
                      minWidth: undefined,
                    },
                  ]
                : []),
            ],
            title: null,
          },
        ]}
      />
      {isLogin && (
        <SettingsSurfaceGroup style={FORM_STYLE.style}>
          <div {...stylex.props(styles.signOut)}>{text('signout', 64, 16)}</div>
        </SettingsSurfaceGroup>
      )}
    </Flexbox>
  );
};

export default SettingsProfileSkeleton;
