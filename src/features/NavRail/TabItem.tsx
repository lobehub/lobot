'use client';

import type { IconType } from '@lobehub/icons';
import { Icon, Tooltip } from '@lobehub/ui';
import * as stylex from '@stylexjs/stylex';
import { memo, type ReactNode } from 'react';

import { useWorkspaceAwareNavigate } from '@/features/Workspace/useWorkspaceAwareNavigate';
import WorkspaceLink from '@/features/Workspace/WorkspaceLink';
import { isModifierClick } from '@/utils/navigation';

import { styles, TAB_ICON_SIZE } from './style';

interface TabItemProps {
  active?: boolean;
  badge?: number;
  /** Replaces the icon, e.g. the avatar on the Settings tab. */
  children?: ReactNode;
  icon?: IconType;
  /** Runs instead of navigating when the tab is clicked while already open. */
  onReselect?: () => void;
  title: string;
  url: string;
}

const TabItem = memo<TabItemProps>(({ active, badge, children, icon, onReselect, title, url }) => {
  const navigate = useWorkspaceAwareNavigate();

  return (
    <Tooltip placement={'top'} title={title}>
      <WorkspaceLink
        aria-current={active ? 'page' : undefined}
        aria-label={title}
        {...stylex.props(styles.item, active && styles.itemActive)}
        to={url}
        onClick={(e) => {
          if (isModifierClick(e)) return;
          e.preventDefault();
          if (active && onReselect) onReselect();
          else navigate(url);
        }}
      >
        {children ?? (icon && <Icon icon={icon} size={TAB_ICON_SIZE} />)}
        {!!badge && badge > 0 && (
          <span {...stylex.props(styles.badge)}>{badge > 99 ? '99+' : badge}</span>
        )}
      </WorkspaceLink>
    </Tooltip>
  );
});

TabItem.displayName = 'TabItem';

export default TabItem;
