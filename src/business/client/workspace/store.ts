'use client';

import { createReplicaState, type ReplicaState } from 'local-replica';
import { useLayoutEffect } from 'react';
import useSWR, { type SWRResponse } from 'swr';
import { shallow } from 'zustand/shallow';
import { createWithEqualityFn } from 'zustand/traditional';

import { mutate } from '@/libs/swr/mutate';
import { expose } from '@/store/middleware/expose';

import type { WorkspaceListItem } from '../hooks/useActiveWorkspace';
import type { WorkspaceMemberWithProfile } from '../hooks/useWorkspaceMembers';
import { workspaceService } from './service';

/**
 * The workspace context Lobot sends to the server. LobeHub Cloud keeps it in the
 * URL (`/:workspaceSlug/...`), but Lobot has no workspace routes, so the active
 * workspace lives here and reaches the server as the `X-Workspace-Id` header
 * (`trpc-headers.ts`). SWR and replica caches follow it through
 * `getActiveWorkspaceId`, so scoped data refetches on a switch by itself.
 */
export interface WorkspaceState {
  activeWorkspaceId: string | null;
  /** The server answered the list, so workspaces can be listed and created (not self-hosted). */
  isWorkspaceAvailable: boolean;
  isWorkspaceLoading: boolean;
  /**
   * Workspace members by workspace id, for author names and avatars. A local replica
   * (`./members.ts`): a workspace visited before paints its roster from disk at once.
   */
  membersMap: Record<string, WorkspaceMemberWithProfile[]>;
  membersReplica: ReplicaState<WorkspaceMemberWithProfile[]>;
  workspaces: WorkspaceListItem[];
}

interface WorkspaceActions {
  switchToPersonal: () => void;
  switchWorkspace: (id: string) => void;
}

export type WorkspaceStore = WorkspaceState & WorkspaceActions;

export const FETCH_WORKSPACES_KEY = 'workspace/list';

/** The last scope the user picked, per user, so a restart reopens it. */
const lastWorkspaceKey = (userId: string) => `lobot:last-workspace:${userId}`;

export const readLastWorkspaceId = (userId: string): string | null => {
  try {
    return localStorage.getItem(lastWorkspaceKey(userId));
  } catch {
    return null;
  }
};

export const writeLastWorkspaceId = (userId: string | null | undefined, id: string | null) => {
  if (!userId) return;
  try {
    if (id) localStorage.setItem(lastWorkspaceKey(userId), id);
    else localStorage.removeItem(lastWorkspaceKey(userId));
  } catch {
    // best-effort
  }
};

export const useWorkspaceStore = createWithEqualityFn<WorkspaceStore>()(
  (set, get) => ({
    activeWorkspaceId: null,
    isWorkspaceAvailable: false,
    // Loading until the first list settles, so nothing paints a scope it may leave.
    isWorkspaceLoading: true,
    membersMap: {},
    membersReplica: createReplicaState(),
    switchToPersonal: () => {
      if (get().activeWorkspaceId !== null) set({ activeWorkspaceId: null });
    },
    switchWorkspace: (id) => {
      if (get().activeWorkspaceId !== id) set({ activeWorkspaceId: id });
    },
    workspaces: [],
  }),
  shallow,
);

// Acceptance runs (`app-probe.sh workspace`) enter their test workspace through it.
expose('workspace', useWorkspaceStore);

export const getWorkspaceStoreState = () => useWorkspaceStore.getState();

/** Refetch the list, e.g. after creating a workspace, so the rail shows it. */
export const refreshWorkspaces = () =>
  mutate((key) => Array.isArray(key) && key[0] === FETCH_WORKSPACES_KEY);

/**
 * A locked-out membership (lapsed subscription) cannot be entered, so it is
 * neither listed nor restored.
 */
const enterable = (workspaces: WorkspaceListItem[]) => workspaces.filter((ws) => !ws.lockedOut);

/**
 * Loads the user's workspaces once signed in and restores the last scope they
 * picked: the `lastWorkspaceId` user preference, else the local copy.
 * `enabled` is `undefined` while sign-in is still resolving.
 */
export const useFetchWorkspaces = (
  enabled: boolean | undefined,
  userId: string | null | undefined,
  lastWorkspaceId?: string | null,
): SWRResponse<WorkspaceListItem[]> => {
  const swr = useSWR<WorkspaceListItem[]>(
    enabled && userId ? [FETCH_WORKSPACES_KEY, userId] : null,
    () => workspaceService.list(),
    {
      onSuccess: (data) => {
        const workspaces = enterable(data ?? []);
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
        useWorkspaceStore.setState({
          activeWorkspaceId: active,
          isWorkspaceAvailable: true,
          workspaces,
        });
      },
    },
  );

  const { error, isLoading } = swr;
  useLayoutEffect(() => {
    if (enabled === undefined) return;
    if (!enabled) {
      useWorkspaceStore.setState({
        activeWorkspaceId: null,
        isWorkspaceAvailable: false,
        isWorkspaceLoading: false,
        workspaces: [],
      });
      return;
    }
    // A server without workspaces (self-hosted) errors here; stay personal.
    useWorkspaceStore.setState({ isWorkspaceLoading: isLoading && !error });
  }, [enabled, error, isLoading]);

  return swr;
};
