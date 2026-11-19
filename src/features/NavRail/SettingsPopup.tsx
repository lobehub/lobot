'use client';

import { Block, Flexbox, Modal, ScrollArea, Text } from '@lobehub/ui';
import { memo, useEffect, useLayoutEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import NavItem from '@/features/NavPanel/components/NavItem';
import { componentMap } from '@/features/Settings/features/componentMap';
import { hasSettingsSubPage, renderSettingsSubPage } from '@/features/Settings/features/subPages';
import { useCategory } from '@/features/Settings/hooks/useCategory';
import { scrollToSettingsAnchor } from '@/features/SettingsSearch/anchor';
import UserAvatar from '@/features/User/UserAvatar';
import { useActiveLocation } from '@/hooks/useActiveLocation';
import { SettingsTabs } from '@/store/global/initialState';
import { useUserStore } from '@/store/user';
import { userProfileSelectors } from '@/store/user/selectors';

import { resetSettingsPopupViewport } from './settingsPopupScroll';
import { isPersonalSettingsPath, useSettingsPopupStore } from './settingsPopupStore';

const ProfileEntry = memo<{ active: boolean; onSelect: () => void }>(({ active, onSelect }) => {
  const [nickname, username] = useUserStore((s) => [
    userProfileSelectors.nickName(s),
    userProfileSelectors.displayUserName(s),
  ]);

  return (
    <Block
      clickable
      horizontal
      align={'center'}
      gap={12}
      padding={8}
      variant={active ? 'filled' : 'borderless'}
      onClick={onSelect}
    >
      <UserAvatar shape={'circle'} size={40} />
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
  );
});

ProfileEntry.displayName = 'SettingsPopupProfileEntry';

/**
 * Settings in a modal with the section list on the left and the tab body on
 * the right, so the footer does not navigate to the full Settings pages.
 */
const SettingsPopup = memo(() => {
  const { t } = useTranslation('common');
  const categoryGroups = useCategory();
  const [open, activeTab, subPage, hash, pending] = useSettingsPopupStore((s) => [
    s.open,
    s.tab,
    s.subPage,
    s.hash,
    s.pending,
  ]);
  const closeSettings = useSettingsPopupStore((s) => s.closeSettings);
  const setTab = useSettingsPopupStore((s) => s.setTab);
  const closeSubPage = useSettingsPopupStore((s) => s.closeSubPage);
  const flushPending = useSettingsPopupStore((s) => s.flushPending);
  const { pathname } = useActiveLocation();
  const pathWhenOpened = useRef<string | null>(null);
  const contentViewportRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (pending && !isPersonalSettingsPath(pathname)) flushPending();
  }, [flushPending, pathname, pending]);

  if (open && pathWhenOpened.current === null) pathWhenOpened.current = pathname;
  if (!open) pathWhenOpened.current = null;

  useEffect(() => {
    if (open && pathWhenOpened.current && pathname !== pathWhenOpened.current) closeSettings();
  }, [closeSettings, open, pathname]);

  useEffect(() => {
    if (!open || !hash) return;
    return scrollToSettingsAnchor(hash);
  }, [hash, open, activeTab, subPage]);

  // Tab / sub-page changes should start at the top, but a search hash must
  // still win — resetting here would scroll the anchor back out of view.
  useLayoutEffect(() => {
    resetSettingsPopupViewport(contentViewportRef.current, { hash, open });
  }, [activeTab, hash, open, subPage]);

  const Content = componentMap[activeTab as keyof typeof componentMap];
  const contentProps: { mobile?: boolean; showSettingHeader?: boolean } = {
    showSettingHeader: false,
  };
  if (activeTab === SettingsTabs.About || activeTab === SettingsTabs.Profile) {
    contentProps.mobile = false;
  }

  const body =
    subPage && hasSettingsSubPage(activeTab, subPage) ? (
      renderSettingsSubPage(activeTab, subPage)
    ) : Content ? (
      <Content {...contentProps} />
    ) : null;

  useEffect(() => {
    if (open && subPage && !hasSettingsSubPage(activeTab, subPage)) closeSubPage();
  }, [activeTab, closeSubPage, open, subPage]);

  return (
    <Modal
      destroyOnHidden
      draggable={false}
      footer={null}
      open={open}
      styles={{ body: { overflow: 'hidden', padding: 0 } }}
      title={t('tab.setting')}
      width={'min(90%, 840px)'}
      onCancel={closeSettings}
    >
      <Flexbox horizontal style={{ height: 'min(70vh, 640px)', minHeight: 420 }}>
        <ScrollArea
          disableContentFit
          scrollFade="vertical"
          style={{
            flex: 'none',
            width: 240,
            height: '100%',
          }}
        >
          <Flexbox gap={8} padding={8}>
            <ProfileEntry
              active={activeTab === SettingsTabs.Profile}
              onSelect={() => setTab(SettingsTabs.Profile)}
            />
            {categoryGroups.map((group) => (
              <Flexbox gap={1} key={group.key}>
                {group.items.map((item) => (
                  <div
                    key={item.key}
                    style={{ cursor: 'pointer' }}
                    onClick={() => setTab(item.key)}
                  >
                    <NavItem active={activeTab === item.key} icon={item.icon} title={item.label} />
                  </div>
                ))}
              </Flexbox>
            ))}
          </Flexbox>
        </ScrollArea>
        <ScrollArea
          disableContentFit
          scrollFade="vertical"
          style={{ flex: 1, height: '100%', minWidth: 0 }}
          viewportProps={{ ref: contentViewportRef }}
        >
          <div style={subPage ? undefined : { padding: 24 }}>{body}</div>
        </ScrollArea>
      </Flexbox>
    </Modal>
  );
});

SettingsPopup.displayName = 'SettingsPopup';

export default SettingsPopup;
