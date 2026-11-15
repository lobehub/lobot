import { describe, expect, it } from 'vitest';

import { channelTitle } from './peerTitle';

const member = (userId: string, userName: string) =>
  ({ actorType: 'user', name: null, userId, userName, username: null }) as never;

describe('channelTitle', () => {
  const detail = {
    channel: { peerUserId: 'u_bob', title: 'Bob' },
    members: [member('u_alice', 'Alice'), member('u_bob', 'Bob')],
  } as never;

  it('names the other person for either side of a conversation between people', () => {
    expect(channelTitle(detail, 'u_alice')).toBe('Bob');
    expect(channelTitle(detail, 'u_bob')).toBe('Alice');
  });

  it('keeps the stored title of any other Channel', () => {
    expect(
      channelTitle({ channel: { peerUserId: null, title: 'Team' }, members: [] } as never, 'u'),
    ).toBe('Team');
  });
});
