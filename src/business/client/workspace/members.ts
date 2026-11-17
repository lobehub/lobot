import { createReplicaSlice, defineReplica, recordLens } from '@/libs/replica';

import type { WorkspaceMemberWithProfile } from '../hooks/useWorkspaceMembers';
import { workspaceService } from './service';
import { useWorkspaceStore, type WorkspaceState } from './store';

/**
 * The workspace roster as a local replica. It used to come over the network on every
 * workspace entry, so until a batch it shared with the slowest queries answered, every agent
 * in Contacts read "unknown author". Persisted per workspace, a roster seen before paints at
 * once and the network only refreshes it.
 *
 * Kept out of `./store.ts`: `@/libs/replica` resolves its cache scope through the active
 * workspace, which that module owns.
 */
export const workspaceMembersResource = defineReplica<
  { workspaceId: string },
  WorkspaceMemberWithProfile[]
>({
  fetcher: ({ workspaceId }) => workspaceService.listMembers(workspaceId),
  key: ({ workspaceId }) => workspaceId,
  name: 'workspaceMembers',
  storage: 'indexedDB',
  version: 1,
});

const membersSlice = createReplicaSlice(workspaceMembersResource, {
  actionPrefix: 'workspace/members',
  get: useWorkspaceStore.getState,
  set: useWorkspaceStore.setState,
  stateKey: 'membersReplica',
  view: recordLens<WorkspaceState, WorkspaceMemberWithProfile[]>('membersMap'),
});

/** Syncs a workspace's roster; the personal space has none and skips it. */
export const useSyncWorkspaceMembers = (workspaceId: string | null) =>
  membersSlice.useSync(workspaceId ? { workspaceId } : null);
