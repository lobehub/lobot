'use client';

import { ActionIcon, DropdownMenu, type DropdownMenuProps, Flexbox, Icon, Text } from '@lobehub/ui';
import * as stylex from '@stylexjs/stylex';
import { LogOut, PieChart, Settings, UsersCollaboration } from 'lucide-react';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useChannelsEnabled } from '@/features/Channels/useChannelsEnabled';
import UserAvatar from '@/features/User/UserAvatar';
import { useSignOut } from '@/hooks/useSignOut';
import { contactActions, contactSelectors, useContactStore } from '@/store/contact';
import { useUserStore } from '@/store/user';
import { userProfileSelectors } from '@/store/user/selectors';
import { electronStylish } from '@/styles/electron';

import ContactsPopup from './ContactsPopup';
import SettingsPopup from './SettingsPopup';
import { useSettingsPopupStore } from './settingsPopupStore';
import { styles } from './style';

/** Contacts' badge counts the friend requests waiting in its Requests group. */
const useContactRequestsCount = (channelsEnabled: boolean) => {
  contactActions.useFetchRequests(channelsEnabled);
  return useContactStore((s) =>
    channelsEnabled ? contactSelectors.incomingRequests(s).length : 0,
  );
};

/**
 * Footer of the list column: the signed-in user on the left opens a dropdown
 * (usage, settings, sign out), and a contacts ActionIcon on the right opens
 * the address book.
 */
const NavTabBar = memo(() => {
  const { t } = useTranslation(['common', 'auth']);
  const signOut = useSignOut();
  const channelsEnabled = useChannelsEnabled();
  const contactRequests = useContactRequestsCount(channelsEnabled);
  const [nickname, username] = useUserStore((s) => [
    userProfileSelectors.nickName(s),
    userProfileSelectors.displayUserName(s),
  ]);
  const name = nickname || username;
  const [contactsOpen, setContactsOpen] = useState(false);
  const settingsOpen = useSettingsPopupStore((s) => s.open);
  const openSettings = useSettingsPopupStore((s) => s.openSettings);
  const closeSettings = useSettingsPopupStore((s) => s.closeSettings);

  useEffect(() => {
    if (settingsOpen) setContactsOpen(false);
  }, [settingsOpen]);

  const toggleContacts = useCallback(() => {
    setContactsOpen((current) => {
      if (!current) closeSettings();
      return !current;
    });
  }, [closeSettings]);
  const closeContacts = useCallback(() => setContactsOpen(false), []);
  const openSettingsMenu = useCallback(() => {
    setContactsOpen(false);
    openSettings();
  }, [openSettings]);

  const menuItems = useMemo<DropdownMenuProps['items']>(
    () => [
      {
        icon: <Icon icon={PieChart} />,
        key: 'usage',
        label: t('userPanel.usages'),
        onClick: openSettingsMenu,
      },
      {
        icon: <Icon icon={Settings} />,
        key: 'settings',
        label: t('tab.setting'),
        onClick: openSettingsMenu,
      },
      { type: 'divider' },
      {
        icon: <Icon icon={LogOut} />,
        key: 'signout',
        label: t('signout', { ns: 'auth' }),
        onClick: () => {
          void signOut();
        },
      },
    ],
    [openSettingsMenu, signOut, t],
  );

  return (
    <Flexbox horizontal {...stylex.props(styles.bar)}>
      <DropdownMenu
        items={menuItems}
        placement={'topLeft'}
        popupProps={{ className: electronStylish.nodrag }}
      >
        <button aria-label={t('tab.setting')} type="button" {...stylex.props(styles.user)}>
          <span {...stylex.props(styles.avatar)}>
            <UserAvatar shape={'circle'} size={36} />
          </span>
          {name && (
            <Text ellipsis fontSize={13} weight={500}>
              {name}
            </Text>
          )}
        </button>
      </DropdownMenu>
      <span
        data-badge={contactRequests || ''}
        data-testid="tab-tab.contacts"
        {...stylex.props(styles.contacts)}
      >
        <ActionIcon
          active={contactsOpen}
          aria-label={t('tab.contacts')}
          icon={UsersCollaboration}
          size={{ blockSize: 36, size: 20, borderRadius: '50%' }}
          title={t('tab.contacts')}
          variant={'outlined'}
          {...stylex.props(styles.contactsIcon)}
          onClick={toggleContacts}
        />
        {contactRequests > 0 && (
          <span {...stylex.props(styles.badge)}>
            {contactRequests > 99 ? '99+' : contactRequests}
          </span>
        )}
      </span>
      <SettingsPopup />
      <ContactsPopup open={contactsOpen} onClose={closeContacts} />
    </Flexbox>
  );
});

NavTabBar.displayName = 'NavTabBar';

export default NavTabBar;
