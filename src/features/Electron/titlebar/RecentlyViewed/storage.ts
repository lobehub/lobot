import { type TabScope, tabScopeKey } from '../TabBar/scope';
import { type TabItem } from '../TabBar/types';

const PINNED_PAGES_STORAGE_KEY_PREFIX = 'lobechat:desktop:pinned-pages:v4';

const pinnedPagesStorageKey = (scope: TabScope): string =>
  `${PINNED_PAGES_STORAGE_KEY_PREFIX}:${tabScopeKey(scope)}`;

const isTabItem = (item: unknown): item is TabItem =>
  !!item &&
  typeof item === 'object' &&
  typeof (item as TabItem).id === 'string' &&
  typeof (item as TabItem).url === 'string' &&
  typeof (item as TabItem).lastVisited === 'number';

export const getPinnedPages = (scope: TabScope): TabItem[] => {
  if (typeof window === 'undefined') return [];

  try {
    const data = window.localStorage.getItem(pinnedPagesStorageKey(scope));
    if (!data) return [];

    const parsed = JSON.parse(data);
    if (!Array.isArray(parsed)) return [];

    return parsed.filter(isTabItem);
  } catch {
    return [];
  }
};

export const savePinnedPages = (scope: TabScope, pages: TabItem[]): boolean => {
  if (typeof window === 'undefined') return false;

  try {
    window.localStorage.setItem(pinnedPagesStorageKey(scope), JSON.stringify(pages));
    return true;
  } catch {
    return false;
  }
};
