import { describe, expect, it } from 'vitest';

import {
  CONVERSATION_DRAG,
  type ConversationDragSource,
  conversationDropActions,
  conversationDropTarget,
  filedSectionId,
  PIN_DROP,
  SECTION_DROP,
} from './conversationDrop';
import { UNGROUPED_SECTION_ID } from './conversations';

const source = (patch: Partial<ConversationDragSource> = {}): ConversationDragSource => ({
  channelId: 'chn_1',
  pinned: false,
  sectionId: null,
  type: CONVERSATION_DRAG,
  ...patch,
});

describe('conversationDropActions', () => {
  it('pins an unpinned conversation and leaves its section alone', () => {
    expect(conversationDropActions(source({ sectionId: 'sec_work' }), { type: 'pin' })).toEqual([
      { channelId: 'chn_1', pinned: true, type: 'pin' },
    ]);
  });

  it('does nothing when a pinned conversation is dropped on the pinned tiles', () => {
    expect(conversationDropActions(source({ pinned: true }), { type: 'pin' })).toEqual([]);
  });

  it('moves a conversation into another section', () => {
    expect(
      conversationDropActions(source({ sectionId: 'sec_work' }), {
        collapsed: false,
        sectionId: 'sec_later',
        type: 'section',
      }),
    ).toEqual([{ channelId: 'chn_1', sectionId: 'sec_later', type: 'move' }]);
  });

  it('does nothing when a conversation is dropped on the section it is already in', () => {
    expect(
      conversationDropActions(source({ sectionId: 'sec_work' }), {
        collapsed: false,
        sectionId: 'sec_work',
        type: 'section',
      }),
    ).toEqual([]);
  });

  it('takes a pinned conversation down into the section it was filed under', () => {
    expect(
      conversationDropActions(source({ pinned: true, sectionId: 'sec_work' }), {
        collapsed: false,
        sectionId: 'sec_work',
        type: 'section',
      }),
    ).toEqual([{ channelId: 'chn_1', pinned: false, type: 'pin' }]);
  });

  it('takes a pinned conversation down into a different section and opens a folded one', () => {
    expect(
      conversationDropActions(source({ pinned: true, sectionId: 'sec_work' }), {
        collapsed: true,
        sectionId: 'sec_later',
        type: 'section',
      }),
    ).toEqual([
      { channelId: 'chn_1', pinned: false, type: 'pin' },
      { channelId: 'chn_1', sectionId: 'sec_later', type: 'move' },
      { sectionId: 'sec_later', type: 'expand' },
    ]);
  });

  it('moves a conversation out into Ungrouped', () => {
    expect(
      conversationDropActions(source({ sectionId: 'sec_work' }), {
        collapsed: false,
        sectionId: null,
        type: 'section',
      }),
    ).toEqual([{ channelId: 'chn_1', sectionId: null, type: 'move' }]);
  });

  it('takes a pinned conversation down into a folded Ungrouped and opens it', () => {
    expect(
      conversationDropActions(source({ pinned: true }), {
        collapsed: true,
        sectionId: null,
        type: 'section',
      }),
    ).toEqual([{ channelId: 'chn_1', pinned: false, type: 'pin' }, { type: 'expand-ungrouped' }]);
  });
});

describe('conversationDropTarget', () => {
  it('reads the pinned tiles and a section', () => {
    expect(conversationDropTarget({ type: PIN_DROP })).toEqual({ type: 'pin' });
    expect(
      conversationDropTarget({ collapsed: true, sectionId: 'sec_work', type: SECTION_DROP }),
    ).toEqual({ collapsed: true, sectionId: 'sec_work', type: 'section' });
  });

  it('reads a missing section id as Ungrouped and ignores a section-header reorder', () => {
    expect(conversationDropTarget({ collapsed: false, type: SECTION_DROP })).toEqual({
      collapsed: false,
      sectionId: null,
      type: 'section',
    });
    expect(conversationDropTarget({ sortable: { index: 0 } })).toBeNull();
    expect(conversationDropTarget(undefined)).toBeNull();
  });
});

describe('filedSectionId', () => {
  const sections = [{ id: 'sec_work' }];

  it('keeps a section the conversation is still filed under', () => {
    expect(filedSectionId('sec_work', sections)).toBe('sec_work');
  });

  it('treats a deleted section and Ungrouped as ungrouped', () => {
    expect(filedSectionId('sec_gone', sections)).toBeNull();
    expect(filedSectionId(UNGROUPED_SECTION_ID, [{ id: UNGROUPED_SECTION_ID }])).toBeNull();
    expect(filedSectionId(null, sections)).toBeNull();
    expect(filedSectionId('sec_work', undefined)).toBeNull();
  });
});
