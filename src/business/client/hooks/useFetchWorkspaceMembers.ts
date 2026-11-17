import { useSyncWorkspaceMembers } from '../workspace/members';
import { useWorkspaceStore } from '../workspace/store';

const EMPTY: never[] = [];

/** Loads the active workspace's members; `useWorkspaceMembers` reads them. */
export const useFetchWorkspaceMembers = () => {
  const workspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
  useSyncWorkspaceMembers(workspaceId);
  const data = useWorkspaceStore((s) => (workspaceId ? s.membersMap[workspaceId] : EMPTY));
  // Loading only until a roster is on screen: the local copy counts, a refresh does not.
  return { data: data ?? EMPTY, isLoading: !!workspaceId && !data };
};
