import type { WorkspaceMemberItem } from '@/types/serverData';

import { useFetchWorkspaceMembers } from './useFetchWorkspaceMembers';

export interface WorkspaceMemberUserProfile {
  avatar?: string | null;
  email?: string | null;
  fullName?: string | null;
  username?: string | null;
}

/** Membership row enriched with the member's display profile (`workspaceMember.list`). */
export type WorkspaceMemberWithProfile = WorkspaceMemberItem & {
  user?: WorkspaceMemberUserProfile | null;
};

/**
 * Members of the active workspace. Reading them also loads them, so a caller such as the
 * Contacts author column never shows "unknown author" just because nothing fetched the list.
 */
export const useWorkspaceMembers = (): WorkspaceMemberWithProfile[] =>
  useFetchWorkspaceMembers().data;

/**
 * Whether the active scope's roster is on screen. An author missing from it is unknown; one
 * missing from a roster still on its way is only not loaded yet. The personal space has no
 * roster to wait for.
 */
export const useWorkspaceMembersReady = (): boolean => !useFetchWorkspaceMembers().isLoading;
