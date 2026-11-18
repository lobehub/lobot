'use client';

import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Flexbox, Icon, Tooltip } from '@lobehub/ui';
import * as stylex from '@stylexjs/stylex';
import { PlusIcon } from 'lucide-react';
import { type HTMLAttributes, memo, type ReactNode, useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { WorkspaceListItem } from '@/business/client/hooks/useActiveWorkspace';
import { useActiveWorkspaceId } from '@/business/client/hooks/useActiveWorkspaceId';
import { useActiveWorkspaceSlug } from '@/business/client/hooks/useActiveWorkspaceSlug';
import { useSwitchWorkspace } from '@/business/client/hooks/useSwitchWorkspace';
import { useWorkspaceStore } from '@/business/client/workspace/store';
import Avatar from '@/components/Avatar';
import WorkspaceAvatar from '@/components/WorkspaceAvatar';
import { CONTACTS_URL } from '@/features/ContactList/const';
import { suppressNextClick } from '@/features/HomeSidebar/Body/sortableRow';
import { requestUnreadJump } from '@/features/MessageList/unreadJump';
import { resolveRailTab } from '@/features/NavRail/railTab';
import { useWorkspaceAwareNavigate } from '@/features/Workspace/useWorkspaceAwareNavigate';
import { useActiveLocation } from '@/hooks/useActiveLocation';
import { useUserStore } from '@/store/user';
import { userProfileSelectors } from '@/store/user/selectors';

import { useOpenCreateWorkspace } from './CreateWorkspace';
import { writeWorkspaceRailHint } from './railHint';
import { RAIL_AVATAR_SIZE, RAIL_TILE_RADIUS, styles } from './style';
import { useOrderedWorkspaces } from './useOrderedWorkspaces';
import { usePersonalRequestCount } from './usePersonalRequestCount';
import { useRailColumnShown } from './useRailColumnShown';
import { useScopeUnread } from './useScopeUnread';

interface RailItemProps {
  active?: boolean;
  children: ReactNode;
  /** dnd-kit's attributes and listeners, when the tile can be dragged. */
  dragProps?: HTMLAttributes<HTMLDivElement>;
  onClick: () => void;
  title: string;
  tooltipDisabled?: boolean;
  /** The scope's unread count, badged on the tile's bottom-right corner. */
  unread?: number;
}

const RailItem = memo<RailItemProps>(
  ({ active, children, dragProps, onClick, title, tooltipDisabled, unread }) => (
    <Tooltip disabled={tooltipDisabled} placement={'right'} title={title}>
      <div
        role={'button'}
        {...dragProps}
        aria-current={active ? 'page' : undefined}
        aria-label={title}
        {...stylex.props(styles.item, stylex.defaultMarker())}
        onClick={onClick}
      >
        {active !== undefined && (
          <>
            {!active && <span {...stylex.props(styles.dot)} />}
            <span {...stylex.props(styles.pill, active && styles.pillActive)} />
          </>
        )}
        {children}
        {!!unread && unread > 0 && (
          <span {...stylex.props(styles.unread)}>{unread > 999 ? '999+' : unread}</span>
        )}
      </div>
    </Tooltip>
  ),
);

RailItem.displayName = 'WorkspaceRailItem';

interface SortableWorkspaceItemProps {
  active: boolean;
  /** Any tile is being dragged: tooltips would trail the pointer across the rail. */
  dragging: boolean;
  onOpen: (id: string) => void;
  /** Clicking the open workspace again while it has unread messages. */
  onReselect: () => void;
  workspace: WorkspaceListItem;
}

const SortableWorkspaceItem = memo<SortableWorkspaceItemProps>(
  ({ active, dragging, onOpen, onReselect, workspace }) => {
    const { attributes, isDragging, listeners, setNodeRef, transform, transition } = useSortable({
      id: workspace.id,
    });
    const unread = useScopeUnread(workspace.id, active);

    return (
      // The sortable node wraps the tile so the Tooltip keeps its own ref on the tile.
      <div
        ref={setNodeRef}
        style={{
          flex: 'none',
          position: 'relative',
          // The rail only reorders vertically and clips sideways, so drop the pointer's x.
          transform: CSS.Translate.toString(transform && { ...transform, x: 0 }),
          transition,
          width: '100%',
          zIndex: isDragging ? 1 : undefined,
        }}
      >
        <RailItem
          active={active}
          dragProps={{ ...attributes, ...listeners }}
          title={workspace.name}
          tooltipDisabled={dragging}
          unread={unread}
          onClick={() => {
            if (!active) onOpen(workspace.id);
            else if (unread > 0) onReselect();
          }}
        >
          <WorkspaceAvatar
            avatar={workspace.avatar}
            name={workspace.name}
            size={RAIL_AVATAR_SIZE}
            style={{ borderRadius: RAIL_TILE_RADIUS }}
          />
        </RailItem>
      </div>
    );
  },
);

SortableWorkspaceItem.displayName = 'SortableWorkspaceItem';

/**
 * Discord-style scope switcher: the personal space on top, then one avatar per
 * workspace in the user's own order (drag to rearrange), and a button to create one. Picking a scope sends every request to
 * it and lands on the same tab's root (Contacts or Messages). Hidden where the server has no workspaces
 * (self-hosted).
 */
const WorkspaceRail = memo(() => {
  const { t } = useTranslation('common');
  const [available, loading] = useWorkspaceStore((s) => [
    s.isWorkspaceAvailable,
    s.isWorkspaceLoading,
  ]);
  const columnShown = useRailColumnShown();
  const { reorder, workspaces } = useOrderedWorkspaces();
  const [dragging, setDragging] = useState(false);
  const activeId = useActiveWorkspaceId();
  const { switchToPersonal, switchWorkspace } = useSwitchWorkspace();
  const navigate = useWorkspaceAwareNavigate();
  const userAvatar = useUserStore(userProfileSelectors.userAvatar);
  const userName = useUserStore(userProfileSelectors.displayUserName);
  // The personal tile also counts friend requests: a workspace's Contacts never shows them.
  const personalMessagesUnread = useScopeUnread(null, activeId === null);
  const personalRequests = usePersonalRequestCount(activeId === null);
  const personalUnread = personalMessagesUnread + personalRequests;

  const { pathname } = useActiveLocation();
  const activeWorkspaceSlug = useActiveWorkspaceSlug();
  const railTab = resolveRailTab(pathname, activeWorkspaceSlug);
  const stayOnContacts = railTab === 'contacts';

  // Lobot has no workspace routes: switching changes the request scope, then lands on the
  // current tab's root — the Contacts list, or the Messages home — since the open
  // conversation or contact belongs to the scope just left.
  const openHome = useCallback(
    () => navigate(stayOnContacts ? CONTACTS_URL : '/', { escape: true }),
    [navigate, stayOnContacts],
  );
  const openCreate = useOpenCreateWorkspace(openHome);

  // Clicking the open scope's badge goes to its next unread conversation in the Messages list.
  const jumpToUnread = useCallback(() => {
    if (railTab !== 'messages') navigate('/', { escape: true });
    requestUnreadJump();
  }, [navigate, railTab]);

  const openPersonal = useCallback(async () => {
    if (activeId === null) {
      // Friend requests wait in Contacts; unread messages in the Messages list.
      if (personalMessagesUnread > 0) jumpToUnread();
      else if (personalRequests > 0) navigate(CONTACTS_URL, { escape: true });
      return;
    }
    await switchToPersonal();
    openHome();
  }, [
    activeId,
    jumpToUnread,
    navigate,
    openHome,
    personalMessagesUnread,
    personalRequests,
    switchToPersonal,
  ]);

  const openWorkspace = useCallback(
    async (id: string) => {
      if (activeId === id) return;
      await switchWorkspace(id);
      openHome();
    },
    [activeId, openHome, switchWorkspace],
  );

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 4 } }),
    // A press-and-hold picks a tile up on touch, so a vertical swipe still scrolls the rail.
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    setDragging(false);
    // The drop lands on the dragged tile, whose click would switch to it.
    suppressNextClick();
    if (!over || active.id === over.id) return;

    const ids = workspaces.map((workspace) => workspace.id);
    reorder(arrayMove(ids, ids.indexOf(String(active.id)), ids.indexOf(String(over.id))));
  };

  // Remember the outcome once the list settles, for the next boot skeleton.
  useEffect(() => {
    if (!loading) writeWorkspaceRailHint(available);
  }, [available, loading]);

  // Hold the column the rail had last time while the list loads, so the wrap stays put.
  if (!available) return columnShown ? <div aria-hidden {...stylex.props(styles.rail)} /> : null;

  return (
    <Flexbox
      aria-label={t('workspaceRail.title')}
      gap={8}
      role={'navigation'}
      {...stylex.props(styles.rail)}
    >
      <RailItem
        active={activeId === null}
        title={t('workspaceRail.personal')}
        unread={personalUnread}
        onClick={openPersonal}
      >
        <Avatar avatar={userAvatar} name={userName} shape={'circle'} size={RAIL_AVATAR_SIZE} />
      </RailItem>
      <span {...stylex.props(styles.divider)} />
      {/* Only the workspaces reorder: the personal space and the create button stay put. */}
      <DndContext
        collisionDetection={closestCenter}
        sensors={sensors}
        onDragCancel={() => setDragging(false)}
        onDragEnd={handleDragEnd}
        onDragStart={() => setDragging(true)}
      >
        <SortableContext
          items={workspaces.map((workspace) => workspace.id)}
          strategy={verticalListSortingStrategy}
        >
          {workspaces.map((workspace) => (
            <SortableWorkspaceItem
              active={activeId === workspace.id}
              dragging={dragging}
              key={workspace.id}
              workspace={workspace}
              onOpen={openWorkspace}
              onReselect={jumpToUnread}
            />
          ))}
        </SortableContext>
      </DndContext>
      <RailItem title={t('workspaceRail.create')} onClick={openCreate}>
        <span {...stylex.props(styles.add)}>
          <Icon icon={PlusIcon} size={18} />
        </span>
      </RailItem>
    </Flexbox>
  );
});

WorkspaceRail.displayName = 'WorkspaceRail';

export default WorkspaceRail;
