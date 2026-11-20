import { closestCenter, type CollisionDetection, pointerWithin } from '@dnd-kit/core';

import { UNGROUPED_SECTION_ID } from './conversations';

/** A conversation row or pinned tile being dragged. */
export const CONVERSATION_DRAG = 'conversation';

/** The pinned tiles at the top of the list. */
export const PIN_DROP = 'pin';

/** One section, or the ungrouped part of the list (`sectionId` null). */
export const SECTION_DROP = 'section-target';

export interface ConversationDragSource {
  channelId: string;
  pinned: boolean;
  /** The saved section it returns to when unpinned. Null when it sits in Ungrouped. */
  sectionId: string | null;
  type: typeof CONVERSATION_DRAG;
}

export type ConversationDropTarget =
  { type: 'pin' } | { collapsed: boolean; sectionId: string | null; type: 'section' };

export type ConversationDropAction =
  | { channelId: string; pinned: boolean; type: 'pin' }
  | { channelId: string; sectionId: string | null; type: 'move' }
  | { sectionId: string; type: 'expand' }
  | { type: 'expand-ungrouped' };

export const isConversationDragSource = (data: unknown): data is ConversationDragSource => {
  if (!data || typeof data !== 'object') return false;
  const value = data as ConversationDragSource;
  return (
    value.type === CONVERSATION_DRAG &&
    typeof value.channelId === 'string' &&
    typeof value.pinned === 'boolean'
  );
};

/**
 * The saved section a conversation is filed under. A missing section, and the list's own
 * Ungrouped group, both read as ungrouped.
 */
export const filedSectionId = (
  sectionId: string | null | undefined,
  sections: { id: string }[] | undefined,
): string | null =>
  sectionId &&
  sectionId !== UNGROUPED_SECTION_ID &&
  !!sections?.some((section) => section.id === sectionId)
    ? sectionId
    : null;

export const conversationDropTarget = (data: unknown): ConversationDropTarget | null => {
  if (!data || typeof data !== 'object') return null;
  const value = data as { collapsed?: boolean; sectionId?: string | null; type?: string };
  if (value.type === PIN_DROP) return { type: 'pin' };
  if (value.type === SECTION_DROP)
    return {
      collapsed: !!value.collapsed,
      sectionId: typeof value.sectionId === 'string' ? value.sectionId : null,
      type: 'section',
    };
  return null;
};

/**
 * What a drop changes. Pinning keeps the section, so taking the conversation down later puts it
 * back. Dropping a pinned conversation on a group takes it down into that group. Dropping it on
 * the group it is already in only takes it down. A folded group opens, so the row is visible
 * where it landed.
 */
export const conversationDropActions = (
  source: ConversationDragSource,
  target: ConversationDropTarget,
): ConversationDropAction[] => {
  if (target.type === 'pin')
    return source.pinned ? [] : [{ channelId: source.channelId, pinned: true, type: 'pin' }];

  const actions: ConversationDropAction[] = [];
  if (source.pinned) actions.push({ channelId: source.channelId, pinned: false, type: 'pin' });
  if (source.sectionId !== target.sectionId)
    actions.push({ channelId: source.channelId, sectionId: target.sectionId, type: 'move' });
  if (actions.length > 0 && target.collapsed)
    actions.push(
      target.sectionId
        ? { sectionId: target.sectionId, type: 'expand' }
        : { type: 'expand-ungrouped' },
    );
  return actions;
};

const isConversationDrop = (type: unknown) => type === PIN_DROP || type === SECTION_DROP;

/**
 * A drop changes the rows on screen. A workspace switch can still be painting the previous
 * workspace, and those rows are not this list. A ready list kept as a snapshot, so its tiles do
 * not remount, is still this list: the two objects differ, the conversations do not.
 */
export const canApplyConversationDrop = (listReady: boolean, paintedIsLive: boolean): boolean =>
  listReady || paintedIsLive;

/**
 * Section headers reorder among themselves. A conversation lands on the pinned tiles or on a
 * group, whichever the pointer is inside, and ignores the header reorder targets. A keyboard
 * drag has no pointer, so it lands on the group nearest the ghost.
 */
export const conversationCollision: CollisionDetection = (args) => {
  if (args.active.data.current?.type !== CONVERSATION_DRAG) {
    return closestCenter({
      ...args,
      droppableContainers: args.droppableContainers.filter(
        (container) => !isConversationDrop(container.data.current?.type),
      ),
    });
  }

  const targets = args.droppableContainers.filter((container) =>
    isConversationDrop(container.data.current?.type),
  );
  const hit = pointerWithin({ ...args, droppableContainers: targets });
  if (hit.length > 0 || args.pointerCoordinates) return hit;
  return closestCenter({ ...args, droppableContainers: targets });
};
