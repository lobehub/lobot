import { describe, expect, it } from 'vitest';

import { firstNewMessageId, unreadFromBeforeVisit } from './newMessages';

const message = (id: string, sequence: number, authorId = 'agt_cook', type = 'agent') =>
  ({ author: { id: authorId, type }, id, sequence }) as never;

describe('unreadFromBeforeVisit', () => {
  it('is the read position before the visit while something is unread', () => {
    expect(unreadFromBeforeVisit({ sequence: 12, unreadCount: 3 })).toBe(9);
  });

  it('is null when nothing is unread or the row is missing', () => {
    expect(unreadFromBeforeVisit({ sequence: 12, unreadCount: 0 })).toBeNull();
    expect(unreadFromBeforeVisit(undefined)).toBeNull();
  });
});

describe('firstNewMessageId', () => {
  const messages = [
    message('m8', 8),
    message('m9', 9),
    message('m10', 10, 'user_me', 'user'),
    message('m11', 11),
    message('m13', 13),
  ];

  it("goes above the oldest unread message someone else wrote, skipping the viewer's own", () => {
    expect(firstNewMessageId(messages, { readFrom: 9, upTo: 12 }, 'user_me')).toBe('m11');
  });

  it('marks nothing that only arrived during the visit', () => {
    expect(firstNewMessageId(messages, { readFrom: 11, upTo: 11 }, 'user_me')).toBeUndefined();
  });
});
