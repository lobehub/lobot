'use client';

import { useWatchBroadcast } from '@lobechat/electron-client-ipc';
import { memo, useCallback } from 'react';

import { getActiveWorkspaceId } from '@/business/client/hooks/useActiveWorkspaceId';
import { useSwitchWorkspace } from '@/business/client/hooks/useSwitchWorkspace';
import { useWorkspaceAwareNavigate } from '@/features/Workspace/useWorkspaceAwareNavigate';

const DesktopNavigationBridge = memo(() => {
  const navigate = useWorkspaceAwareNavigate();
  const { switchToPersonal, switchWorkspace } = useSwitchWorkspace();

  const handleNavigate = useCallback(
    async ({
      escape,
      path,
      replace,
      workspaceId,
    }: {
      escape?: boolean;
      path: string;
      replace?: boolean;
      workspaceId?: string | null;
    }) => {
      if (!path) return;
      // Lobot has no workspace routes: a path in another scope opens only once that scope is
      // the one requests go to, e.g. a banner for a personal conversation clicked in a workspace.
      if (workspaceId !== undefined && workspaceId !== getActiveWorkspaceId()) {
        if (workspaceId === null) await switchToPersonal();
        else await switchWorkspace(workspaceId);
      }
      if (escape || replace !== undefined) {
        navigate(path, { escape: !!escape, replace: !!replace });
        return;
      }
      navigate(path);
    },
    [navigate, switchToPersonal, switchWorkspace],
  );

  useWatchBroadcast('navigate', handleNavigate);

  return null;
});

DesktopNavigationBridge.displayName = 'DesktopNavigationBridge';

export default DesktopNavigationBridge;
