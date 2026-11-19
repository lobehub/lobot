'use client';

import { Block, Flexbox, Text } from '@lobehub/ui';
import { memo } from 'react';
import { Link } from 'react-router';

import { openSettingsFromUrl } from '@/features/NavRail/settingsPopupStore';
import UserAvatar from '@/features/User/UserAvatar';
import { useWorkspaceAwareNavigate } from '@/features/Workspace/useWorkspaceAwareNavigate';
import { SettingsTabs } from '@/store/global/initialState';
import { useUserStore } from '@/store/user';
import { userProfileSelectors } from '@/store/user/selectors';
import { isModifierClick } from '@/utils/navigation';

const PROFILE_URL = `/settings/${SettingsTabs.Profile}`;

/** Telegram's account card: who is signed in, and the way into the profile page. */
const ProfileCard = memo<{ active: boolean }>(({ active }) => {
  const navigate = useWorkspaceAwareNavigate();
  const [nickname, username] = useUserStore((s) => [
    userProfileSelectors.nickName(s),
    userProfileSelectors.displayUserName(s),
  ]);

  return (
    <Link
      aria-current={active ? 'page' : undefined}
      to={PROFILE_URL}
      onClick={(e) => {
        if (isModifierClick(e)) return;
        e.preventDefault();
        if (!openSettingsFromUrl(PROFILE_URL)) navigate(PROFILE_URL);
      }}
    >
      <Block
        clickable
        horizontal
        align={'center'}
        gap={12}
        padding={8}
        variant={active ? 'filled' : 'borderless'}
      >
        <UserAvatar shape={'circle'} size={48} />
        <Flexbox flex={1} gap={2} style={{ overflow: 'hidden' }}>
          <Text ellipsis fontSize={15} weight={600}>
            {nickname}
          </Text>
          {username && (
            <Text ellipsis fontSize={12} type={'secondary'}>
              {username}
            </Text>
          )}
        </Flexbox>
      </Block>
    </Link>
  );
});

ProfileCard.displayName = 'SettingsProfileCard';

export default ProfileCard;
