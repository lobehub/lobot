'use client';

import { Flexbox } from '@lobehub/ui';
import { cssVar } from '@lobehub/ui/stylex/cssVar.stylex';
import * as stylex from '@stylexjs/stylex';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';

import { useActiveWorkspace } from '@/business/client/hooks/useActiveWorkspace';
import { useWorkspaceStore } from '@/business/client/workspace/store';
import Avatar from '@/components/Avatar';
import WorkspaceAvatar from '@/components/WorkspaceAvatar';
import { useCompactLayout } from '@/features/NavRail/useCompactLayout';
import { useUserStore } from '@/store/user';
import { userProfileSelectors } from '@/store/user/selectors';

const AVATAR_SIZE = 18;

const styles = stylex.create({
  name: {
    overflow: 'hidden',
    fontSize: '13px',
    fontWeight: 500,
    color: cssVar.colorText,
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  root: {
    pointerEvents: 'none',
    position: 'absolute',
    insetInlineStart: '50%',
    transform: 'translateX(-50%)',
    overflow: 'hidden',
    maxWidth: '40%',
  },
});

/**
 * Discord-style window title: the scope the server rail has selected, centred
 * in the titlebar. It only labels where the user is — switching stays on the
 * rail — so it lets drags through to the window.
 */
const ScopeTitle = memo(() => {
  const { t } = useTranslation('common');
  // A compact titlebar has no room between its controls; the rail already marks the scope.
  const compact = useCompactLayout();
  const available = useWorkspaceStore((s) => s.isWorkspaceAvailable);
  const workspace = useActiveWorkspace();
  const userAvatar = useUserStore(userProfileSelectors.userAvatar);
  const userName = useUserStore(userProfileSelectors.displayUserName);

  if (!available || compact) return null;

  const name = workspace ? workspace.name : t('workspaceRail.personal');

  return (
    <Flexbox horizontal align={'center'} gap={8} {...stylex.props(styles.root)}>
      {workspace ? (
        <WorkspaceAvatar
          avatar={workspace.avatar}
          name={workspace.name}
          size={AVATAR_SIZE}
          style={{ borderRadius: 5, flex: 'none' }}
        />
      ) : (
        <Avatar
          avatar={userAvatar}
          name={userName}
          shape={'circle'}
          size={AVATAR_SIZE}
          style={{ flex: 'none' }}
        />
      )}
      <span {...stylex.props(styles.name)}>{name}</span>
    </Flexbox>
  );
});

ScopeTitle.displayName = 'ScopeTitle';

export default ScopeTitle;
