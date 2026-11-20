'use client';

import {
  type DraggableSyntheticListeners,
  useDndContext,
  useDraggable,
  useDroppable,
} from '@dnd-kit/core';
import * as stylex from '@stylexjs/stylex';
import { createContext, memo, type ReactNode, use } from 'react';

import {
  CONVERSATION_DRAG,
  conversationDropActions,
  isConversationDragSource,
  PIN_DROP,
  SECTION_DROP,
} from './conversationDrop';
import { styles } from './style';

interface ConversationDragHandle {
  isDragging: boolean;
  /** Mouse, touch and keyboard activators from the list's drag sensors. */
  listeners: DraggableSyntheticListeners;
  setNodeRef: (element: HTMLElement | null) => void;
}

const ConversationDragContext = createContext<ConversationDragHandle | null>(null);

export const useConversationDrag = () => use(ConversationDragContext);

interface ConversationDragProps {
  channelId?: string;
  children: ReactNode;
  /** A search lists a filtered set, so a drop would file the conversation blindly. */
  disabled?: boolean;
  /** Stable id for the drag. A row without a Channel cannot be moved. */
  dragKey: string;
  pinned: boolean;
  sectionId: string | null;
}

/** Makes one conversation follow the pointer. The row itself is the handle. */
export const ConversationDrag = memo<ConversationDragProps>(
  ({ channelId, children, disabled, dragKey, pinned, sectionId }) => {
    const enabled = !!channelId && !disabled;
    const { isDragging, listeners, setNodeRef } = useDraggable({
      data: enabled ? { channelId, pinned, sectionId, type: CONVERSATION_DRAG } : undefined,
      disabled: !enabled,
      id: `conversation:${dragKey}`,
    });
    if (!enabled) return children;

    return (
      <ConversationDragContext value={{ isDragging, listeners, setNodeRef }}>
        {children}
      </ConversationDragContext>
    );
  },
);

ConversationDrag.displayName = 'ConversationDrag';

const useArmed = (target: Parameters<typeof conversationDropActions>[1]) => {
  const { active } = useDndContext();
  const source = isConversationDragSource(active?.data.current) ? active.data.current : undefined;
  return !!source && conversationDropActions(source, target).length > 0;
};

interface ConversationPinDropProps {
  children: ReactNode;
  count: number;
  label: string;
  rows: boolean;
}

/** The pinned tiles, and the empty slot they leave while a conversation is dragged up. */
export const ConversationPinDrop = memo<ConversationPinDropProps>(
  ({ children, count, label, rows }) => {
    const { isOver, setNodeRef } = useDroppable({ data: { type: PIN_DROP }, id: 'drop-pin' });
    const armed = useArmed({ type: 'pin' });
    if (count === 0 && !armed) return null;

    return (
      <div
        aria-label={label}
        ref={setNodeRef}
        role="group"
        {...stylex.props(
          count === 0 && styles.dropSlot,
          count > 0 && rows && styles.pinnedRows,
          count > 0 && !rows && styles.pinnedGroup,
          count >= 4 && !rows && styles.pinnedGroupDense,
          isOver && armed && styles.dropOver,
        )}
      >
        {children}
      </div>
    );
  },
);

ConversationPinDrop.displayName = 'ConversationPinDrop';

/** The unsectioned rows. While a pinned conversation is dragged, an empty list still catches it. */
export const ConversationRestDrop = memo<{ children: ReactNode }>(({ children }) => {
  const { isOver, setNodeRef } = useDroppable({
    data: { collapsed: false, sectionId: null, type: SECTION_DROP },
    id: 'drop-section:rest',
  });
  const armed = useArmed({ collapsed: false, sectionId: null, type: 'section' });
  const empty = !children || (Array.isArray(children) && children.length === 0);
  if (empty && !armed) return null;

  return (
    <div
      ref={setNodeRef}
      {...stylex.props(
        styles.dropStack,
        empty && styles.dropSlot,
        isOver && armed && styles.dropOver,
      )}
    >
      {children}
    </div>
  );
});

ConversationRestDrop.displayName = 'ConversationRestDrop';
