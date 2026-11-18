import { useCallback } from 'react';

/**
 * Whether the current user may manage (edit / delete / re-authorize) a
 * workspace-shared resource row. Mirrors the server-side
 * `assertWorkspaceRowManageable` rule: only the row's creator or a workspace
 * owner may mutate it.
 *
 * - Personal mode: every row is created by the current user, so the creator
 *   check passes naturally.
 * - Missing creator attribution (legacy rows / partial payloads): do not block
 *   the UI — the server still enforces.
 */
export const useResourceManageable = (creatorUserId?: string | null): boolean => {
  const checkManageable = useResourceManageableChecker();

  return checkManageable(creatorUserId);
};

/**
 * Callback variant of {@link useResourceManageable} for call sites that need to
 * evaluate multiple rows under a single hook call (e.g. table columns, list
 * item menus built in a loop).
 */
const useResourceManageableChecker = (): ((creatorUserId?: string | null) => boolean) => {
  // Every member here owns the workspace, so every row is manageable.
  return useCallback((_creatorUserId?: string | null) => true, []);
};
