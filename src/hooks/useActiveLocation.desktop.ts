import { useCallback, useMemo } from 'react';
import { type Location } from 'react-router';

import { selectActiveTabUrl } from '@/features/Electron/shell/activeTabUrl';
import { type ElectronStore, useElectronStore } from '@/store/electron';

// Tab urls only ever carry pathname+search: `TabLocationReporter` and the
// eviction snapshot both persist `pathname + search`, never a hash. Drop any
// stray hash so this mirror stays aligned with what the store holds.
const parseLocation = (url: string): Location => {
  const withoutHash = url.split('#')[0];

  const searchIndex = withoutHash.indexOf('?');
  const search = searchIndex === -1 ? '' : withoutHash.slice(searchIndex);
  const pathname = searchIndex === -1 ? withoutHash : withoutHash.slice(0, searchIndex);

  return { hash: '', key: 'default', pathname: pathname || '/', search, state: null };
};

export const useActiveLocation = (): Location => {
  const url = useElectronStore(selectActiveTabUrl) ?? '/';
  return useMemo(() => parseLocation(url), [url]);
};

const activeLocation = (state: ElectronStore): Location =>
  parseLocation(selectActiveTabUrl(state) ?? '/');

/**
 * Subscribes to one value derived from the active tab's location, re-rendering only when that
 * value changes. `useActiveLocation` re-renders on every navigation, which is what made every row
 * of a long list repaint each time the person opened another conversation.
 *
 * Expects:
 * - A selector returning a primitive (or otherwise stable) value; it runs on every store change.
 */
export const useActiveLocationSelector = <T>(selector: (location: Location) => T): T =>
  useElectronStore((s) => selector(activeLocation(s)));

/**
 * Returns a getter for the active tab's location, for handlers that need where the person is when
 * they run. Reading it does not subscribe, so a navigation does not re-render the caller.
 */
export const useActiveLocationReader = (): (() => Location) =>
  useCallback(() => activeLocation(useElectronStore.getState()), []);
