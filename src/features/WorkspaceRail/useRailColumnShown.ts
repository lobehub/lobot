import { useRef, useState } from 'react';

import { useWorkspaceStore } from '@/business/client/workspace/store';
import { useUserStore } from '@/store/user';
import { userGeneralSettingsSelectors } from '@/store/user/selectors';

import { readWorkspaceRailHint } from './railHint';

interface RailListState {
  isWorkspaceAvailable: boolean;
  isWorkspaceListInit?: boolean;
  isWorkspaceLoading: boolean;
}

/**
 * The rail has workspaces to show: the server answered, or the saved list was read back while
 * that answer is still on its way. Waiting for the network left a blank column on every start.
 * A server without workspaces (self-hosted) never saved one, and its error ends the loading.
 */
export const workspaceRailListed = (s: RailListState): boolean =>
  s.isWorkspaceAvailable || (s.isWorkspaceLoading && !!s.isWorkspaceListInit);

/**
 * The bootstrap flag drops on every workspace switch while the new scope
 * loads. Settings are not cleared with it, so the first successful init is
 * enough: a later drop must not take the rail down and put it back.
 */
export const useWorkspaceRailSettingReady = (): boolean => {
  const init = useUserStore((s) => s.isUserStateInit);
  const seen = useRef(false);
  if (init) seen.current = true;
  return init || seen.current;
};

/**
 * Whether the rail takes its column left of the wrap. The appearance setting
 * has to be on, and the server has to have workspaces; while either is still
 * loading, the column stays if the rail showed last time. The titlebar reads
 * it to line up with the list column.
 */
export const useRailColumnShown = (): boolean => {
  const [available, loading] = useWorkspaceStore((s) => [
    workspaceRailListed(s),
    s.isWorkspaceLoading,
  ]);
  // Read once: the hint only bridges the first load.
  const [shownLastTime] = useState(readWorkspaceRailHint);
  const enabled = useUserStore(userGeneralSettingsSelectors.showWorkspaceRail);
  const ready = useWorkspaceRailSettingReady();

  if (!ready) return shownLastTime && (loading || available);
  return enabled && (available || (loading && shownLastTime));
};
