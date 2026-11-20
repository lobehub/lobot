'use client';

import { Text } from '@lobehub/ui';
import { Fragment, useEffect, useState } from 'react';

import NavHeader from '@/features/NavHeader';
import SettingContainer from '@/features/Setting/SettingContainer';
import { useSettingsAnchorScroll } from '@/features/SettingsSearch/anchor';
import { useWorkspaceAwareNavigate } from '@/features/Workspace/useWorkspaceAwareNavigate';
import { SettingsTabs } from '@/store/global/initialState';

import { componentMap } from './componentMap';
import { getSettingsContainerMaxWidth, INSET_TABS, OWN_FRAME_TABS } from './ownFrameTabs';
import { SettingsPageActionsContext, SettingsPageActionsRow } from './SettingsPageActions';
import { hasSettingsSubPage, renderSettingsSubPage } from './subPages';
import { useSettingsTabTitle } from './tabTitles';

const REDIRECT_MAP: Record<string, string> = {
  [SettingsTabs.Common]: SettingsTabs.Profile,
  [SettingsTabs.ChatAppearance]: SettingsTabs.Profile,
  [SettingsTabs.Language]: SettingsTabs.Profile,
};

/**
 * Where a tab URL lands instead: legacy aliases and the appearance page (its
 * controls now sit on profile) map to profile. Appearance sub-pages stay.
 * Tabs Lobot does not offer (providers, skills, OAuth apps, …) go to profile.
 */
const getSettingsRedirect = (tab: string | undefined, subPage?: string): string | undefined => {
  if (!tab) return;
  if (REDIRECT_MAP[tab]) return REDIRECT_MAP[tab];
  if (tab === SettingsTabs.Appearance && !subPage) return SettingsTabs.Profile;
  if (!(tab in componentMap)) return SettingsTabs.Profile;
};

interface SettingsContentProps {
  activeTab?: string;
  mobile?: boolean;
  /** Second-level page inside the tab, e.g. `username` under profile */
  subPage?: string;
}

const SettingsContent = ({ mobile, activeTab, subPage }: SettingsContentProps) => {
  const navigate = useWorkspaceAwareNavigate();
  const title = useSettingsTabTitle(activeTab);
  const [pageActions, setPageActions] = useState<HTMLElement | null>(null);

  useSettingsAnchorScroll();

  // An unknown sub page falls back to its tab rather than rendering nothing.
  const redirectTo =
    getSettingsRedirect(activeTab, subPage) ??
    (subPage && !hasSettingsSubPage(activeTab, subPage) ? activeTab : undefined);

  useEffect(() => {
    // `escape: true` keeps the user in personal context even when a workspace is active.
    // Keep the hash so a search for a control that used to live on appearance
    // still scrolls to it after the page folds into profile.
    if (!redirectTo) return;
    const hash = globalThis.location?.hash ?? '';
    navigate(`/settings/${redirectTo}${hash}`, { escape: true, replace: true });
  }, [redirectTo, navigate]);

  const renderComponent = (tab: string) => {
    const Component = componentMap[tab as keyof typeof componentMap];
    if (!Component) return null;

    // The shared navigation header (desktop) or the mobile layout header shows
    // the tab title, so no tab draws a second, in-page title.
    const componentProps: { mobile?: boolean; showSettingHeader?: boolean } = {
      showSettingHeader: false,
    };
    if ([SettingsTabs.About, SettingsTabs.Profile].includes(tab as any)) {
      componentProps.mobile = mobile;
    }

    return <Component {...componentProps} />;
  };

  if (redirectTo) return null;

  // Sub pages (e.g. profile → username) draw their own header with a back button.
  if (subPage) return renderSettingsSubPage(activeTab, subPage);

  if (mobile) {
    return activeTab ? renderComponent(activeTab) : renderComponent(SettingsTabs.Profile);
  }

  return (
    <>
      {Object.keys(componentMap).map((tabKey) => {
        if (activeTab !== tabKey) return null;
        const content = renderComponent(tabKey);
        if (OWN_FRAME_TABS.has(tabKey)) return <Fragment key={tabKey}>{content}</Fragment>;
        const inset = INSET_TABS.has(tabKey);
        return (
          <Fragment key={tabKey}>
            <NavHeader styles={{ center: { alignItems: 'center' } }}>
              {title && <Text weight={500}>{title}</Text>}
            </NavHeader>
            <SettingsPageActionsContext value={pageActions}>
              <SettingContainer
                maxWidth={getSettingsContainerMaxWidth(tabKey)}
                paddingBlock={'24px 128px'}
                paddingInline={24}
                style={inset ? { background: 'transparent' } : undefined}
              >
                {/* Page actions sit in the content column so they align with the body. */}
                <SettingsPageActionsRow ref={setPageActions} />
                {content}
              </SettingContainer>
            </SettingsPageActionsContext>
          </Fragment>
        );
      })}
    </>
  );
};

export default SettingsContent;
