'use client';

import { createReplicaState, type ReplicaState } from 'local-replica';
import { shallow } from 'zustand/shallow';
import { createWithEqualityFn } from 'zustand/traditional';

import { expose } from '@/store/middleware/expose';

import type { WorkspaceListItem } from '../hooks/useActiveWorkspace';
import type { WorkspaceMemberWithProfile } from '../hooks/useWorkspaceMembers';

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
  /** `workspaces` holds a list (persisted or fetched), not the empty default. */
  isWorkspaceListInit: boolean;
  isWorkspaceLoading: boolean;
  /**
   * Workspace members by workspace id, for author names and avatars. A local replica
   * (`./members.ts`): a workspace visited before paints its roster from disk at once.
   */
  membersMap: Record<string, WorkspaceMemberWithProfile[]>;
  membersReplica: ReplicaState<WorkspaceMemberWithProfile[]>;
  /**
   * The scope reopened at boot from the local copy, before the list answered
   * (`restoreLastWorkspace`). Still a guess, not a pick made this session: the
   * first list answer re-checks it against the server-side preference.
   */
  restoredWorkspaceId: string | null;
  workspaces: WorkspaceListItem[];
  /** Replica bookkeeping for `workspaces` (`./list.ts`). */
  workspacesReplica: ReplicaState<WorkspaceListItem[]>;
}

interface WorkspaceActions {
  switchToPersonal: () => void;
  switchWorkspace: (id: string) => void;
}

export type WorkspaceStore = WorkspaceState & WorkspaceActions;

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
    isWorkspaceListInit: false,
    membersMap: {},
    membersReplica: createReplicaState(),
    restoredWorkspaceId: null,
    switchToPersonal: () => {
      if (get().activeWorkspaceId !== null) set({ activeWorkspaceId: null });
    },
    switchWorkspace: (id) => {
      if (get().activeWorkspaceId !== id) set({ activeWorkspaceId: id });
    },
    workspaces: [],
    workspacesReplica: createReplicaState(),
  }),
  shallow,
);

/**
 * Reopen the last scope before the first paint, so a restart lands in the
 * workspace instead of painting the personal space until the workspace list
 * answers. `preferred` is the cached `lastWorkspaceId` preference (`null` is an
 * explicit personal pick); without it the local copy decides. The list answer
 * still verifies the guess and drops a workspace the user lost access to.
 */
export const restoreLastWorkspace = (userId: string, preferred?: string | null): void => {
  const id = preferred !== undefined ? preferred : readLastWorkspaceId(userId);
  if (!id) return;
  useWorkspaceStore.setState({ activeWorkspaceId: id, restoredWorkspaceId: id });
};

// Acceptance runs (`app-probe.sh workspace`) enter their test workspace through it.
expose('workspace', useWorkspaceStore);

export const getWorkspaceStoreState = () => useWorkspaceStore.getState();
