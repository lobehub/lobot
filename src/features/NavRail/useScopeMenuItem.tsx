'use client';

import { type DropdownItem, Icon } from '@lobehub/ui';
import { ArrowLeftRight, Check, PlusIcon } from 'lucide-react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { useActiveWorkspaceId } from '@/business/client/hooks/useActiveWorkspaceId';
import { useWorkspaceStore } from '@/business/client/workspace/store';
import Avatar from '@/components/Avatar';
import WorkspaceAvatar from '@/components/WorkspaceAvatar';
import { useOpenScope } from '@/features/WorkspaceRail/useOpenScope';
import { useOrderedWorkspaces } from '@/features/WorkspaceRail/useOrderedWorkspaces';
import { useUserStore } from '@/store/user';
import { userProfileSelectors } from '@/store/user/selectors';

const MENU_AVATAR_SIZE = 18;

/**
 * The footer menu's scope switcher: the workspace rail is off by default, so the
 * personal space and every workspace are also one submenu away here. Labelled
 * with the scope in use; `null` where the server has no workspaces (self-hosted).
 */
export const useScopeMenuItem = (): DropdownItem => {
  const { t } = useTranslation('common');
  const available = useWorkspaceStore((s) => s.isWorkspaceAvailable);
  const activeId = useActiveWorkspaceId();
  const { workspaces } = useOrderedWorkspaces();
  const { openCreate, openPersonal, openWorkspace } = useOpenScope();
  const userAvatar = useUserStore(userProfileSelectors.userAvatar);
  const userName = useUserStore(userProfileSelectors.displayUserName);

  return useMemo<DropdownItem>(() => {
    if (!available) return null;

    const check = (active: boolean) => (active ? <Icon icon={Check} size={14} /> : undefined);
    const personalLabel = t('workspaceRail.personal');
    const activeName = workspaces.find((ws) => ws.id === activeId)?.name ?? personalLabel;

    return {
      children: [
        {
          extra: check(activeId === null),
          icon: (
            <Avatar avatar={userAvatar} name={userName} shape={'square'} size={MENU_AVATAR_SIZE} />
          ),
          key: 'scope-personal',
          label: personalLabel,
          onClick: () => {
            if (activeId !== null) void openPersonal();
          },
        },
        ...workspaces.map((ws) => ({
          extra: check(activeId === ws.id),
          icon: (
            <WorkspaceAvatar
              avatar={ws.avatar}
              name={ws.name}
              shape={'square'}
              size={MENU_AVATAR_SIZE}
            />
          ),
          key: `scope-${ws.id}`,
          label: ws.name,
          onClick: () => {
            if (activeId !== ws.id) void openWorkspace(ws.id);
          },
        })),
        { type: 'divider' as const },
        {
          icon: <Icon icon={PlusIcon} />,
          key: 'scope-create',
          label: t('workspaceRail.create'),
          onClick: openCreate,
        },
      ],
      icon: <Icon icon={ArrowLeftRight} />,
      key: 'scope',
      label: activeName,
    };
  }, [
    activeId,
    available,
    openCreate,
    openPersonal,
    openWorkspace,
    t,
    userAvatar,
    userName,
    workspaces,
  ]);
};
