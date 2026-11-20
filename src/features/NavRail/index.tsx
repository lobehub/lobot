'use client';

import { ActionIcon, DropdownMenu, type DropdownMenuProps, Flexbox, Icon, Text } from '@lobehub/ui';
import * as stylex from '@stylexjs/stylex';
import { Settings, UsersCollaboration } from 'lucide-react';
import { memo, useCallback, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { useContactsTitle } from '@/features/ContactList/useContactsTitle';
import {
  AVATAR_SIZE,
  COLUMN_ACTION_ICON_SIZE,
  styles as listStyles,
} from '@/features/MessageList/style';
import UserAvatar from '@/features/User/UserAvatar';
import { contactActions, contactSelectors, useContactStore } from '@/store/contact';
import { useUserStore } from '@/store/user';
import { userProfileSelectors } from '@/store/user/selectors';
import { electronStylish } from '@/styles/electron';

import ContactsPopup from './ContactsPopup';
import { useContactsPopupStore } from './contactsPopupStore';
import SettingsPopup from './SettingsPopup';
import { useSettingsPopupStore } from './settingsPopupStore';
import { styles } from './style';
import { useScopeMenuItem } from './useScopeMenuItem';

/** Contacts' badge counts the friend requests waiting in its Requests group. */
const useContactRequestsCount = () => {
  contactActions.useFetchRequests(true);
  return useContactStore((s) => contactSelectors.incomingRequests(s).length);
};

/**
 * Footer of the list column: the signed-in user on the left opens a dropdown
 * with only the scope switch and settings — usage and sign out live inside
 * settings (sign out is the last row of Profile), so a stray click here can't
 * end the session. A contacts ActionIcon on the right opens the address book.
 */
const NavTabBar = memo(() => {
  const { t } = useTranslation('common');
  const contactsTitle = useContactsTitle();
  const contactRequests = useContactRequestsCount();
  const [nickname, username] = useUserStore((s) => [
    userProfileSelectors.nickName(s),
    userProfileSelectors.displayUserName(s),
  ]);
  const name = nickname || username;
  const contactsOpen = useContactsPopupStore((s) => s.open);
  const openContacts = useContactsPopupStore((s) => s.openContacts);
  const closeContacts = useContactsPopupStore((s) => s.closeContacts);
  const scopeItem = useScopeMenuItem();
  const settingsOpen = useSettingsPopupStore((s) => s.open);
  const openSettings = useSettingsPopupStore((s) => s.openSettings);

  useEffect(() => {
    if (settingsOpen) closeContacts();
  }, [closeContacts, settingsOpen]);

  const toggleContacts = useCallback(() => {
    if (contactsOpen) closeContacts();
    else openContacts();
  }, [closeContacts, contactsOpen, openContacts]);
  const openSettingsMenu = useCallback(() => {
    closeContacts();
    openSettings();
  }, [closeContacts, openSettings]);

  const menuItems = useMemo<DropdownMenuProps['items']>(
    () => [
      ...(scopeItem ? [scopeItem, { type: 'divider' as const }] : []),
      {
        icon: <Icon icon={Settings} />,
        key: 'settings',
        label: t('tab.setting'),
        onClick: openSettingsMenu,
      },
    ],
    [openSettingsMenu, scopeItem, t],
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
            <UserAvatar shape={'circle'} size={AVATAR_SIZE} />
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
          aria-label={contactsTitle}
          icon={UsersCollaboration}
          size={COLUMN_ACTION_ICON_SIZE}
          title={contactsTitle}
          variant={'outlined'}
          {...stylex.props(listStyles.columnActionIcon)}
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
