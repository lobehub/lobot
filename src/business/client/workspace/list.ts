import { useLayoutEffect } from 'react';

import {
  createReplicaSlice,
  defineReplica,
  identityOnlyScope,
  type ReplicaLens,
  type ReplicaSyncResult,
} from '@/libs/replica';

import type { WorkspaceListItem } from '../hooks/useActiveWorkspace';
import { workspaceService } from './service';
import { readLastWorkspaceId, useWorkspaceStore, type WorkspaceState } from './store';

const WORKSPACE_LIST_KEY = 'list';

/**
 * A locked-out membership (lapsed subscription) cannot be entered, so it is
 * neither listed nor restored.
 */
const enterable = (workspaces: WorkspaceListItem[]) => workspaces.filter((ws) => !ws.lockedOut);

/**
 * The signed-in user's workspaces. Partitioned by identity only: the list is
 * the same from every workspace, and the active workspace this list resolves
 * is what the per-workspace cache scope is built from.
 *
 * Kept out of `./store.ts`, like `./members.ts`: `@/libs/replica` resolves its
 * cache scope through the active workspace, which that module owns.
 */
export const workspaceListResource = defineReplica<{ userId: string }, WorkspaceListItem[]>({
  key: () => WORKSPACE_LIST_KEY,
  name: 'workspaceList',
  scope: identityOnlyScope,
  storage: 'indexedDB',
  version: 1,
});

const workspaceListLens: ReplicaLens<WorkspaceState, WorkspaceListItem[]> = {
  clear: () => ({ isWorkspaceListInit: false, workspaces: [] }),
  get: (state) => (state.isWorkspaceListInit ? state.workspaces : undefined),
  keys: (state) => (state.isWorkspaceListInit ? [WORKSPACE_LIST_KEY] : []),
  set: (_state, _key, data) =>
    data
      ? { isWorkspaceListInit: true, workspaces: data }
      : { isWorkspaceListInit: false, workspaces: [] },
};

const workspaceListSlice = createReplicaSlice(workspaceListResource, {
  actionPrefix: 'workspace/list',
  fetcher: async () => enterable(await workspaceService.list()),
  get: useWorkspaceStore.getState,
  set: useWorkspaceStore.setState,
  stateKey: 'workspacesReplica',
  view: workspaceListLens,
});

/** Refetch the list, e.g. after creating a workspace, so the rail shows it. */
export const refreshWorkspaces = () => workspaceListSlice.revalidate();

/**
 * Loads the user's workspaces once signed in and restores the last scope they
 * picked: the `lastWorkspaceId` user preference, else the local copy.
 * `enabled` is `undefined` while sign-in is still resolving.
 */
export const useFetchWorkspaces = (
  enabled: boolean | undefined,
  userId: string | null | undefined,
  lastWorkspaceId?: string | null,
): ReplicaSyncResult => {
  const sync = workspaceListSlice.useSync(enabled && userId ? { userId } : null, {
    onSuccess: (workspaces) => {
      const { activeWorkspaceId, isWorkspaceAvailable } = useWorkspaceStore.getState();
      // `null` in the preference is an explicit pick of the personal space.
      const remembered =
        lastWorkspaceId !== undefined
          ? lastWorkspaceId
          : userId
            ? readLastWorkspaceId(userId)
            : null;
      // The remembered scope only restores the first load. Afterwards the pick made
      // this session stands, personal included: a switch refetches the user state,
      // and one read before the preference write lands still names the old scope.
      const candidate = isWorkspaceAvailable
        ? activeWorkspaceId
        : (activeWorkspaceId ?? remembered);
      // A workspace the user lost access to falls back to the personal space.
      const active = candidate && workspaces.some((ws) => ws.id === candidate) ? candidate : null;
      useWorkspaceStore.setState({ activeWorkspaceId: active, isWorkspaceAvailable: true });
    },
  });

  const { error } = sync;
  const isWorkspaceAvailable = useWorkspaceStore((s) => s.isWorkspaceAvailable);
  useLayoutEffect(() => {
    if (enabled === undefined) return;
    if (!enabled) {
      void workspaceListSlice.clear();
      useWorkspaceStore.setState({
        activeWorkspaceId: null,
        isWorkspaceAvailable: false,
        isWorkspaceLoading: false,
      });
      return;
    }
    // Loading until the first list answers. A server without workspaces
    // (self-hosted) errors here; stay personal.
    useWorkspaceStore.setState({ isWorkspaceLoading: !isWorkspaceAvailable && !error });
  }, [enabled, error, isWorkspaceAvailable]);

  return sync;
};
