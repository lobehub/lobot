import { useSyncExternalStore } from 'react';

import { useActiveWorkspaceSlug } from '@/business/client/hooks/useActiveWorkspaceSlug';
import { useDisplayedTabUrl } from '@/features/Electron/TabHost/displayedTab';

import { COMPACT_LAYOUT_MEDIA_QUERY, compactBackTarget, isCompactListRoute } from './compactLayout';

const getMediaQuery = () =>
  typeof window === 'undefined' || !window.matchMedia
    ? null
    : window.matchMedia(COMPACT_LAYOUT_MEDIA_QUERY);

const subscribe = (onChange: () => void) => {
  const query = getMediaQuery();
  if (!query) return () => {};
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
};

const getSnapshot = () => getMediaQuery()?.matches ?? false;

const getServerSnapshot = () => false;

/** Whether the window is too narrow for the list column and the content side by side. */
export const useCompactLayout = (): boolean =>
  useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

/** The pathname of the tab on screen, which the shell chrome (list column, back button) follows. */
const useDisplayedPathname = () => (useDisplayedTabUrl() ?? '/').split(/[#?]/)[0] || '/';

export interface CompactRoute {
  /** Where the content page's back button leads; `null` when it has none. */
  backTarget: string | null;
  /** The window is compact. */
  compact: boolean;
  /** Compact and on a tab root, so the list column fills the window. */
  showList: boolean;
}

export const useCompactRoute = (): CompactRoute => {
  const compact = useCompactLayout();
  const pathname = useDisplayedPathname();
  const activeWorkspaceSlug = useActiveWorkspaceSlug();

  if (!compact) return { backTarget: null, compact, showList: false };

  return {
    backTarget: compactBackTarget(pathname, activeWorkspaceSlug),
    compact,
    showList: isCompactListRoute(pathname, activeWorkspaceSlug),
  };
};
