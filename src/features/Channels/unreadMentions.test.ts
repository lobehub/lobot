import type { ChannelPublicMessage } from '@lobot/types';
import { describe, expect, it } from 'vitest';

import {
  mayHaveEarlierMentions,
  readPositionBeforeVisit,
  unreadMentionsOf,
} from './unreadMentions';

const members = [
  { actorType: 'user' as const, id: 'mem_self', userId: 'self' },
  { actorType: 'user' as const, id: 'mem_other', userId: 'other' },
];

const message = (
  sequence: number,
  patch: Partial<ChannelPublicMessage> = {},
): ChannelPublicMessage =>
  ({
    author: { avatar: null, id: 'other', name: 'Other', type: 'user' },
    id: `msg_${sequence}`,
    mentions: [],
    sequence,
    ...patch,
  }) as ChannelPublicMessage;

describe('readPositionBeforeVisit', () => {
  it('derives the read position from the listed unread count', () => {
    expect(readPositionBeforeVisit({ mentionCount: 2, sequence: 40, unreadCount: 15 })).toBe(25);
  });

  it('is null without an unread mention, so nothing is offered', () => {
    expect(readPositionBeforeVisit(undefined)).toBeNull();
    expect(readPositionBeforeVisit({ mentionCount: 0, sequence: 40, unreadCount: 15 })).toBeNull();
    expect(readPositionBeforeVisit({ mentionCount: 1, sequence: 40, unreadCount: 0 })).toBeNull();
  });
});

describe('unreadMentionsOf', () => {
  it('keeps unread messages that mention the viewer, oldest first', () => {
    const found = unreadMentionsOf(
      [
        message(30, { mentions: ['mem_self'] }),
        message(12, { mentions: ['mem_self'] }),
        message(8, { mentions: ['mem_self'] }),
        message(20, { mentions: ['mem_other'] }),
      ],
      members,
      'self',
      { readFrom: 10, upTo: 40 },
    );
    expect(found.map((entry) => entry.sequence)).toEqual([12, 30]);
  });

  it('skips deleted messages and the viewer mentioning themselves', () => {
    const found = unreadMentionsOf(
      [
        message(12, { deletedAt: new Date(), mentions: ['mem_self'] }),
        message(13, {
          author: { avatar: null, id: 'self', name: 'Me', type: 'user' },
          mentions: ['mem_self'],
        }),
      ],
      members,
      'self',
      { readFrom: 10, upTo: 40 },
    );
    expect(found).toEqual([]);
  });

  it('finds nothing when the viewer is not a member', () => {
    expect(
      unreadMentionsOf([message(12, { mentions: ['mem_self'] })], members, 'x', {
        readFrom: 0,
        upTo: 40,
      }),
    ).toEqual([]);
  });

  it('leaves out mentions that arrive while the conversation is open', () => {
    const found = unreadMentionsOf(
      [message(12, { mentions: ['mem_self'] }), message(41, { mentions: ['mem_self'] })],
      members,
      'self',
      { readFrom: 10, upTo: 40 },
    );
    expect(found.map((entry) => entry.sequence)).toEqual([12]);
  });
});

describe('mayHaveEarlierMentions', () => {
  it('looks further back only while the loaded pages start after the read position', () => {
    expect(mayHaveEarlierMentions(50, true, 10)).toBe(true);
    expect(mayHaveEarlierMentions(11, true, 10)).toBe(false);
    expect(mayHaveEarlierMentions(50, false, 10)).toBe(false);
    expect(mayHaveEarlierMentions(undefined, true, 10)).toBe(false);
  });
});
