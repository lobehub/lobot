import type { ChannelPublicMember, ChannelPublicMessage } from '@lobot/types';
import { describe, expect, it } from 'vitest';

import { authorAvatar, isCurrentUserAuthor, isCurrentUserMember, memberAvatar } from './memberName';

const author = (
  patch: Partial<ChannelPublicMessage['author']> = {},
): ChannelPublicMessage['author'] => ({
  avatar: null,
  id: 'self',
  name: 'Local Testing',
  type: 'user',
  ...patch,
});

describe('Channel personal avatar ownership', () => {
  it('identifies the viewer in mention lists by actor type and user id, not the member id', () => {
    expect(isCurrentUserMember({ actorType: 'user', userId: 'self' }, 'self')).toBe(true);
    expect(isCurrentUserMember({ actorType: 'user', userId: 'other' }, 'self')).toBe(false);
    expect(isCurrentUserMember({ actorType: 'agent', userId: 'self' }, 'self')).toBe(false);
    expect(isCurrentUserMember({ actorType: 'user', userId: null }, undefined)).toBe(false);
  });
  it('uses the personal avatar component for self even when the channel profile has no avatar', () => {
    expect(isCurrentUserAuthor(author(), 'self')).toBe(true);
  });
  it('uses the live personal avatar rather than a stale avatar in the message response', () => {
    expect(isCurrentUserAuthor(author({ avatar: '/old-avatar.png' }), 'self')).toBe(true);
  });
  it('never borrows the viewer avatar for a different member, even with the same name', () => {
    expect(isCurrentUserAuthor(author({ id: 'other' }), 'self')).toBe(false);
  });
  it('never substitutes a personal avatar for an Agent', () => {
    expect(isCurrentUserAuthor(author({ type: 'agent' }), 'self')).toBe(false);
  });
  it('does not identify a deleted member or an unresolved viewer as self', () => {
    expect(isCurrentUserAuthor(author({ id: null }), 'self')).toBe(false);
    expect(isCurrentUserAuthor(author(), undefined)).toBe(false);
  });
});

// A person without an image showed a stock 😀 in the Channel while the message list drew their
// generated pixel avatar; leaving the image empty lets `UserAvatar` draw that same face.
describe('Channel avatar images', () => {
  const member = (patch: Partial<ChannelPublicMember>) => patch as ChannelPublicMember;

  it('leaves a person without an image empty instead of a stock emoji', () => {
    expect(memberAvatar(member({ actorType: 'user', userAvatar: null }))).toBeUndefined();
    expect(authorAvatar(author())).toBeUndefined();
  });
  it('keeps the image a person or an Agent has', () => {
    expect(memberAvatar(member({ actorType: 'user', userAvatar: '/ann.png' }))).toBe('/ann.png');
    expect(memberAvatar(member({ actorType: 'agent', avatar: '🤖' }))).toBe('🤖');
    expect(authorAvatar(author({ avatar: '/ann.png' }))).toBe('/ann.png');
  });
});
