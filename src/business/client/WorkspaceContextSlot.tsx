'use client';

import { type PropsWithChildren } from 'react';

import { useUserStore } from '@/store/user';
import { authSelectors, userProfileSelectors } from '@/store/user/selectors';

import { useFetchWorkspaces } from './workspace/list';

/** Loads the signed-in user's workspaces for the rail and the request scope. */
export default function WorkspaceContextSlot({ children }: PropsWithChildren) {
  const isUserStateInit = useUserStore((s) => s.isUserStateInit);
  const isLogin = useUserStore(authSelectors.isLogin);
  const userId = useUserStore(userProfileSelectors.userId);
  const lastWorkspaceId = useUserStore((s) => s.preference?.lastWorkspaceId);

  useFetchWorkspaces(isUserStateInit ? !!isLogin : undefined, userId, lastWorkspaceId);

  return children;
}
