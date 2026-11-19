import type { DesktopBootstrapIdentity } from '@lobechat/electron-client-ipc';

import { restoreLastWorkspace } from '@/business/client/workspace/store';
import { useUserStore } from '@/store/user';
import { readUserDisplaySnapshot, userFromDisplaySnapshot } from '@/store/user/displaySnapshot';
import type { LobeUser } from '@/types/user';

export const applyDesktopBootstrapIdentity = (
  identity:
    DesktopBootstrapIdentity | undefined = window.electronAPI?.getDesktopBootstrapIdentity?.(),
): void => {
  if (!identity) return;

  const state = useUserStore.getState();
  const isKnownUser = !!identity.userId && state.user?.id === identity.userId;
  const snapshot =
    identity.userId && !isKnownUser ? readUserDisplaySnapshot(identity.userId) : undefined;

  const nextUser = identity.userId
    ? isKnownUser
      ? state.user
      : userFromDisplaySnapshot(snapshot, { id: identity.userId } as LobeUser)
    : identity.isIdentityResolved
      ? undefined
      : state.user;

  useUserStore.setState({
    isIdentityResolved: identity.isIdentityResolved,
    isLoaded: true,
    isSignedIn: identity.isIdentityResolved ? Boolean(identity.userId) : state.isSignedIn,
    user: nextUser,
    ...(snapshot?.preference && { preference: snapshot.preference }),
    ...(snapshot?.settings && { settings: snapshot.settings }),
  });

  // Reopen the last workspace in the same synchronous step: the cache scope and the
  // first paint read it, and waiting for the workspace list painted the personal
  // space first, then jumped.
  if (identity.userId) {
    restoreLastWorkspace(
      identity.userId,
      (snapshot?.preference ?? (isKnownUser ? state.preference : undefined))?.lastWorkspaceId,
    );
  }
};
