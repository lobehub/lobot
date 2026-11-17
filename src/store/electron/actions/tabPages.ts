import { nanoid } from 'nanoid';

import { guardedMergeCache } from '@/features/Electron/titlebar/TabBar/resolveRouteMeta';
import { resolveTabUpdate } from '@/features/Electron/titlebar/TabBar/resolveTabUpdate';
import {
  isSameTabTarget,
  PERSONAL_TAB_SCOPE,
  resolveTabScope,
  type TabScope,
  tabScopeKey,
} from '@/features/Electron/titlebar/TabBar/scope';
import { getTabPages, saveTabPages } from '@/features/Electron/titlebar/TabBar/storage';
import { type TabItem } from '@/features/Electron/titlebar/TabBar/types';
import { normalizeTabUrl } from '@/features/Electron/titlebar/TabBar/url';
import { type DynamicRouteMeta } from '@/spa/router/routeMeta';
import { type StoreSetter } from '@/store/types';

import { type ElectronStore } from '../store';

const generateTabId = (): string => `tab_${nanoid(8)}`;

// ======== Types ======== //

/**
 * The desktop window is a single page per scope, IM-style: navigation happens in
 * the one live tab, and the server rail switches scopes. `tabs` holds at most
 * that one tab — it stays a list so routers, persistence and recently-viewed
 * keep one shape for the page they mirror.
 */
export interface TabPagesState {
  activeTabId: string | null;
  activeTabScope: TabScope;
  tabs: TabItem[];
}

// ======== Initial State ======== //

export const tabPagesInitialState: TabPagesState = {
  activeTabScope: PERSONAL_TAB_SCOPE,
  activeTabId: null,
  tabs: [],
};

// ======== Action Implementation ======== //

type Setter = StoreSetter<ElectronStore>;
export const createTabPagesSlice = (set: Setter, get: () => ElectronStore, _api?: unknown) =>
  new TabPagesActionImpl(set, get, _api);

class TabPagesActionImpl {
  readonly #get: () => ElectronStore;
  readonly #set: Setter;

  constructor(set: Setter, get: () => ElectronStore, _api?: unknown) {
    void _api;
    this.#set = set;
    this.#get = get;
  }

  activateTab = (id: string): void => {
    const { tabs } = this.#get();
    const tab = tabs.find((t) => t.id === id);
    if (!tab) return;

    this.#set(
      { activeTabId: id, tabs: [{ ...tab, lastVisited: Date.now() }] },
      false,
      'activateTab',
    );
    this.#persist();
  };

  /**
   * Show `url` as the scope's page. A matching tab is kept (its router and
   * in-page state survive); anything else replaces the current tab with a fresh
   * one, because a live router is never re-pointed at a new url from the store.
   */
  addTab = (url: string, cached?: DynamicRouteMeta): string => {
    this.#ensureScopeForUrl(url);
    const existing = this.#get().tabs.find((t) => isSameTabTarget(t, url));

    if (existing) {
      this.activateTab(existing.id);
      return existing.id;
    }

    const tab: TabItem = { cached, id: generateTabId(), lastVisited: Date.now(), url };
    this.#set({ activeTabId: tab.id, tabs: [tab] }, false, 'addTab');
    this.#persist();
    return tab.id;
  };

  loadTabs = (url = '/'): void => {
    this.#loadScope(resolveTabScope(url), true);
  };

  updateTab = (id: string, url: string): string => {
    const { tabs } = this.#get();
    const index = tabs.findIndex((t) => t.id === id);
    if (index < 0) return id;

    const prev = tabs[index];
    const sameTarget = normalizeTabUrl(url) === normalizeTabUrl(prev.url);

    const newTabs = [...tabs];
    newTabs[index] = {
      ...prev,
      cached: sameTarget ? prev.cached : undefined,
      lastVisited: Date.now(),
      url,
    };

    this.#set({ tabs: newTabs }, false, 'updateTab');
    this.#persist();
    return id;
  };

  // Router→store snapshot taken by TabHost right before a router is disposed
  // (e.g. its scope is swapped out), so a cold restore lands where the user left.
  // `lastVisited` is intentionally preserved: a snapshot is not a visit.
  snapshotTabLocation = (id: string, url: string): void => {
    const { tabs } = this.#get();
    const index = tabs.findIndex((t) => t.id === id);
    if (index < 0) return;

    const prev = tabs[index];
    if (url === prev.url) return;

    const sameTarget = normalizeTabUrl(url) === normalizeTabUrl(prev.url);

    const newTabs = [...tabs];
    newTabs[index] = { ...prev, cached: sameTarget ? prev.cached : undefined, url };

    this.#set({ tabs: newTabs }, false, 'snapshotTabLocation');
    this.#persist();
  };

  reportTabLocation = (id: string, url: string): void => {
    const { activeTabScope, tabs } = this.#get();
    if (!tabs.some((t) => t.id === id)) return;

    const action = resolveTabUpdate(activeTabScope, url);
    if (action.type === 'scope-swap') {
      this.#swapScope(action.scope, action.url);
      return;
    }

    this.updateTab(id, url);
  };

  updateTabCache = (id: string, cached: DynamicRouteMeta): void => {
    const { tabs } = this.#get();
    const index = tabs.findIndex((t) => t.id === id);
    if (index < 0) return;

    const merged = guardedMergeCache(tabs[index].cached, cached);
    if (merged === tabs[index].cached) return;

    const newTabs = [...tabs];
    newTabs[index] = { ...newTabs[index], cached: merged };

    this.#set({ tabs: newTabs }, false, 'updateTabCache');
    this.#persist();
  };

  // Cross-scope in-tab navigation reported by TabLocationReporter: persist the
  // old scope with its tab still at the pre-nav url, load the target scope, then
  // show the url there. TabHost disposes the old-scope router once `tabs` swaps
  // (one-way; no router is ever navigated from here).
  #swapScope = (scope: TabScope, url: string): void => {
    this.#persist();
    this.#loadScope(scope, true);
    this.addTab(url);
  };

  #persist = (): void => {
    const { activeTabScope, tabs, activeTabId } = this.#get();
    saveTabPages(activeTabScope, tabs, activeTabId);
  };

  #ensureScopeForUrl = (url: string): void => {
    const scope = resolveTabScope(url);
    const { activeTabScope } = this.#get();
    if (tabScopeKey(activeTabScope) === tabScopeKey(scope)) return;

    this.#loadScope(scope);
  };

  // Storage written by the multi-tab strip can hold several tabs per scope; only
  // the one the user was on survives the load.
  #loadScope = (scope: TabScope, force = false): void => {
    const { activeTabScope } = this.#get();
    if (!force && tabScopeKey(activeTabScope) === tabScopeKey(scope)) return;

    const stored = getTabPages(scope);
    const tab =
      stored.tabs.find((t) => t.id === stored.activeTabId) ??
      stored.tabs.reduce<TabItem | undefined>(
        (latest, t) => (!latest || t.lastVisited > latest.lastVisited ? t : latest),
        undefined,
      );

    this.#set(
      { activeTabId: tab?.id ?? null, activeTabScope: scope, tabs: tab ? [tab] : [] },
      false,
      'loadTabs',
    );
  };
}

export type TabPagesAction = Pick<TabPagesActionImpl, keyof TabPagesActionImpl>;
