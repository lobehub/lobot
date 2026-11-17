import type { ChannelDetail } from '@lobechat/types';
import { describe, expect, it } from 'vitest';

import { canInviteMembers, visibleChannelDetail } from './channelAccess';

describe('Channel access after revalidation', () => {
  const cached = { channel: { title: 'Previously accessible' } } as ChannelDetail;
  it.each(['BAD_REQUEST', 'NOT_FOUND', 'FORBIDDEN', 'UNAUTHORIZED'])(
    'hides retained content after %s',
    (code) => {
      expect(visibleChannelDetail(cached, { data: { code } })).toBeUndefined();
    },
  );
  it('retains content on transient transport failures', () => {
    expect(visibleChannelDetail(cached, new Error('network unavailable'))).toBe(cached);
    expect(visibleChannelDetail(cached, undefined)).toBe(cached);
  });
});

describe('inviting members', () => {
  const open = { canDelete: true, status: 'active', workspaceId: null } as const;
  it('lets an admin invite from an open Channel', () => {
    expect(canInviteMembers(open)).toBe(true);
  });
  it('lets either person invite from a workspace conversation between two people', () => {
    expect(canInviteMembers({ ...open, peerUserId: 'peer', workspaceId: 'ws' })).toBe(true);
  });
  it.each([
    ['a plain member', { canDelete: false }],
    ['an archived Channel', { status: 'archived' as const }],
    ['a personal conversation between two people', { peerUserId: 'peer' }],
  ])('offers no invite to %s', (_, override) => {
    expect(canInviteMembers({ ...open, ...override })).toBe(false);
  });
});
