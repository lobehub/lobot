'use client';

import { Flexbox } from '@lobehub/ui';
import { memo, useMemo } from 'react';
import { Link } from 'react-router';

import NavItem from '@/features/NavPanel/components/NavItem';
import { openSettingsFromUrl } from '@/features/NavRail/settingsPopupStore';
import { getTabUrl, SearchSection } from '@/features/SettingsSearch';
import { useWorkspaceAwareNavigate } from '@/features/Workspace/useWorkspaceAwareNavigate';
import { useActiveLocation } from '@/hooks/useActiveLocation';
import { SettingsTabs } from '@/store/global/initialState';
import { isModifierClick } from '@/utils/navigation';

import { useCategory } from '../../hooks/useCategory';
import ProfileCard from './ProfileCard';

/** `/settings/appearance` → `appearance`; bare `/settings` is the profile page. */
const useActiveTab = () => {
  const { pathname } = useActiveLocation();

  return useMemo(() => {
    const parts = pathname.split('/');
    const index = parts.indexOf('settings');
    return (parts[index + 1] as SettingsTabs | undefined) || SettingsTabs.Profile;
  }, [pathname]);
};

/**
 * Settings list column: the account card first, then the everyday sections in
 * plain groups, the way Telegram lays out its settings list.
 */
const Body = memo(() => {
  const categoryGroups = useCategory();
  const searchScope = useMemo(() => ({ categoryGroups }), [categoryGroups]);
  const navigate = useWorkspaceAwareNavigate();
  const activeTab = useActiveTab();

  return (
    <Flexbox gap={8} paddingBlock={'0 12px'} paddingInline={4}>
      <SearchSection scope={searchScope}>
        <ProfileCard active={activeTab === SettingsTabs.Profile} />
        {categoryGroups.map((group) => (
          <Flexbox gap={1} key={group.key}>
            {group.items.map((item) => {
              const url = item.href ?? getTabUrl(item.key);
              return (
                <Link
                  key={item.key}
                  to={url}
                  onClick={(e) => {
                    if (isModifierClick(e)) return;
                    e.preventDefault();
                    if (!openSettingsFromUrl(url)) navigate(url);
                  }}
                >
                  <NavItem active={activeTab === item.key} icon={item.icon} title={item.label} />
                </Link>
              );
            })}
          </Flexbox>
        ))}
      </SearchSection>
    </Flexbox>
  );
});

Body.displayName = 'SettingsSidebarBody';

export default Body;
