'use client';

import { DEFAULT_USER_AVATAR_URL } from '@lobechat/const';
import type { SidebarAgentItem } from '@lobechat/types';
import { agentDisplayName, agentSecondaryDisplayName } from '@lobechat/types';
import {
  ActionIcon,
  Avatar,
  ContextMenuTrigger,
  createStaticStyles,
  cssVar,
  cx,
  type DropdownItem,
  Flexbox,
  Text,
  Tooltip,
} from '@lobehub/ui';
import dayjs from 'dayjs';
import { EyeIcon, EyeOffIcon } from 'lucide-react';
import { memo, type MouseEvent, useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { CONTACT_URL } from '@/features/ContactList/const';
import WorkspaceLink from '@/features/Workspace/WorkspaceLink';

import ItemActions from './ItemActions';
import LabelTags from './LabelTags';
import SidebarItemAvatar from './SidebarItemAvatar';

/** Fixed action-column width (sidebar-eye toggle + "…" menu) so rows stay aligned. */
const ACTION_COL_WIDTH = 64;

/** Author avatar slot — reserved even when the author is unknown. */
const AUTHOR_COL_WIDTH = 20;

const styles = createStaticStyles(({ css, cssVar }) => ({
  /**
   * Fills the rest of the identity link and truncates to one line; only a row
   * too narrow for both columns drops it.
   */
  description: css`
    flex: 1 1 0;
    min-width: 0;
    color: ${cssVar.colorTextTertiary};

    @container agent-row (width < 600px) {
      display: none;
    }
  `,
  /**
   * Name + role as one column. Sized against the ROW container (`cqi`), not the
   * identity link: the trailing label pills are content-sized, so a column that
   * shrinks with the link would start each row's description at a different x.
   */
  heading: css`
    flex: none;
    gap: 8px;
    align-items: baseline;

    width: clamp(160px, 38cqi, 420px);
    min-width: 0;

    @container agent-row (width < 600px) {
      flex: 1 1 0;
      width: auto;
    }
  `,
  // The link spans the identity columns (name, role, description) but not the
  // whole row — a management list is for scanning and acting, and a full-row
  // link turns clicks on the author / timestamp / action columns into a
  // navigation.
  identity: css`
    cursor: pointer;

    display: flex;
    flex: 1;
    gap: 12px;
    align-items: center;

    min-width: 0;

    color: inherit;

    &:hover .agent-row-title {
      text-decoration: underline;
    }
  `,
  /** The name keeps its width; the role beside it truncates first. */
  name: css`
    flex: 0 1 auto;
    min-width: 0;
  `,
  role: css`
    flex: 0 1000 auto;
    min-width: 0;
    color: ${cssVar.colorTextTertiary};
  `,
  row: css`
    container: agent-row / inline-size;

    padding-block: 8px;
    padding-inline: 12px;
    border-radius: ${cssVar.borderRadiusLG};

    color: inherit;

    &:hover {
      background: ${cssVar.colorFillTertiary};
    }
  `,
  /**
   * Reserved width, right-aligned: "3 天前" and "2026-07-22" differ by ~30px,
   * and a content-sized column puts the author avatar and the label pills at a
   * different x on every row. `min-width` (not `width`) so an unusually long
   * relative string — en's "a few seconds ago" — grows instead of truncating.
   */
  updatedAt: css`
    flex: none;

    min-width: 88px;

    color: ${cssVar.colorTextQuaternary};
    text-align: end;
    white-space: nowrap;
  `,
}));

/** < 7 days → relative time; older → plain date (mirrors TopicSelector). */
const formatUpdatedAt = (updatedAt: Date | number | string) =>
  dayjs().diff(dayjs(updatedAt), 'd') < 7
    ? dayjs(updatedAt).fromNow()
    : dayjs(updatedAt).format('YYYY-MM-DD');

export interface AgentRowAuthor {
  avatar?: string | null;
  name?: string | null;
}

interface AgentRowProps {
  /** Creator profile; rendered only when `showAuthor` is set. */
  author?: AgentRowAuthor | null;
  item: SidebarAgentItem;
  /**
   * Toggle whether this item appears in the caller's sidebar. A membership
   * action, deliberately distinct from the sidebar's own 置顶 pin
   * (`agents.pinned`) — that stays untouched.
   */
  onToggleSidebar?: (item: SidebarAgentItem) => void;
  /** Whether to render the author column (workspace mode). */
  showAuthor?: boolean;
  /** Whether the caller removed this item from their sidebar (default listed). */
  sidebarHidden?: boolean;
}

const AgentRow = memo<AgentRowProps>(
  ({ author, item, onToggleSidebar, showAuthor, sidebarHidden }) => {
    const { t } = useTranslation('common');
    const { description, id, updatedAt } = item;
    // Groups have no personal name, so this resolves to their title.
    const displayTitle = agentDisplayName(item, t('agentViewAll.untitled'));
    const role = agentSecondaryDisplayName(item);
    const [anchor, setAnchor] = useState<HTMLElement | null>(null);

    // Right-click support (Task-List-style): the hook-bearing menu mounts on
    // the ROW's pointer-enter (which always precedes a right-click) and hands
    // its filtered items back via ref for the ContextMenuTrigger.
    const [menuActivated, setMenuActivated] = useState(false);
    const activateMenu = useCallback(() => setMenuActivated(true), []);
    const menuItemsRef = useRef<(() => DropdownItem[]) | null>(null);
    const handleMenuReady = useCallback((getItems: () => DropdownItem[]) => {
      menuItemsRef.current = getItems;
    }, []);
    const getContextMenuItems = useCallback(() => menuItemsRef.current?.() ?? [], []);

    const handleToggleSidebar = useCallback(
      (e: MouseEvent) => {
        e.stopPropagation();
        onToggleSidebar?.(item);
      },
      [item, onToggleSidebar],
    );

    return (
      <ContextMenuTrigger items={getContextMenuItems}>
        <Flexbox
          horizontal
          align={'center'}
          className={styles.row}
          gap={12}
          ref={setAnchor}
          onPointerEnter={activateMenu}
        >
          <WorkspaceLink aria-label={displayTitle} className={styles.identity} to={CONTACT_URL(id)}>
            <SidebarItemAvatar item={item} size={28} />
            {/* Who the agent is with the role it plays right after the name,
              then what it is responsible for. */}
            <Flexbox horizontal className={styles.heading}>
              <Text ellipsis className={cx('agent-row-title', styles.name)} weight={500}>
                {displayTitle}
              </Text>
              {role && (
                <Text ellipsis className={styles.role} title={role}>
                  {role}
                </Text>
              )}
            </Flexbox>
            <Text ellipsis className={styles.description} title={description ?? undefined}>
              {description}
            </Text>
          </WorkspaceLink>
          {/* Trailing cluster (Task-list-style): label pills + author avatar +
            update time as one tight right-aligned group. */}
          <Flexbox
            horizontal
            align={'center'}
            flex={'none'}
            gap={8}
            justify={'flex-end'}
            style={{ maxWidth: 420, overflow: 'hidden' }}
          >
            <LabelTags labels={item.labels} />
            {showAuthor && (
              // The slot is reserved even without an author, so an unknown
              // author doesn't shift the row's label pills sideways.
              <Flexbox flex={'none'} style={{ width: AUTHOR_COL_WIDTH }}>
                {author && (
                  <Tooltip title={author.name}>
                    <Avatar
                      avatar={author.avatar || DEFAULT_USER_AVATAR_URL}
                      size={AUTHOR_COL_WIDTH}
                    />
                  </Tooltip>
                )}
              </Flexbox>
            )}
            <Text
              className={styles.updatedAt}
              fontSize={12}
              title={updatedAt ? dayjs(updatedAt).format('YYYY-MM-DD HH:mm') : undefined}
            >
              {updatedAt ? formatUpdatedAt(updatedAt) : '–'}
            </Text>
          </Flexbox>
          <Flexbox
            horizontal
            align={'center'}
            flex={'none'}
            gap={4}
            style={{ width: ACTION_COL_WIDTH }}
          >
            {onToggleSidebar && (
              <ActionIcon
                color={cssVar.colorTextSecondary}
                icon={sidebarHidden ? EyeOffIcon : EyeIcon}
                size={'small'}
                // Hidden agents read as faded, mirroring the customize-sidebar
                // modal's 0.5-opacity treatment of hidden rows.
                style={{ opacity: sidebarHidden ? 0.5 : undefined }}
                title={
                  sidebarHidden
                    ? t('agentViewAll.addToSidebar')
                    : t('agentViewAll.removeFromSidebar')
                }
                onClick={handleToggleSidebar}
              />
            )}
            {/* Visible "…" trigger AND right-click open the same menu — the
              context menu alone proved undiscoverable (users assumed rows had
              no actions). The menu carries the sidebar toggle too; the eye
              icon stays as the fast single-click path. */}
            <ItemActions
              anchor={anchor}
              forceActivated={menuActivated}
              includeSidebarToggle={Boolean(onToggleSidebar)}
              item={item}
              sidebarHidden={sidebarHidden}
              onMenuReady={handleMenuReady}
              onToggleSidebar={onToggleSidebar}
            />
          </Flexbox>
        </Flexbox>
      </ContextMenuTrigger>
    );
  },
);

AgentRow.displayName = 'AgentRow';

export default AgentRow;
