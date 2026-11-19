import type { ChannelDetail } from '@lobot/types';
import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useChannelStore } from '@/store/channel';

import {
  canInviteMembers,
  showsListedShell,
  useCanInviteMembers,
  visibleChannelDetail,
} from './channelAccess';

describe('Channel access after revalidation', () => {
  const cached = { channel: { title: 'Previously accessible' } } as ChannelDetail;
  it.each(['BAD_REQUEST', 'NOT_FOUND', 'FORBIDDEN'])('hides retained content after %s', (code) => {
    expect(visibleChannelDetail(cached, { data: { code } })).toBeUndefined();
  });
  // A lapsed session says nothing about this Channel: a launch whose first request beat the
  // token refresh must keep the stored conversation, not show the blank page.
  it('retains content when the session is not authorized yet', () => {
    expect(visibleChannelDetail(cached, { data: { code: 'UNAUTHORIZED' } })).toBe(cached);
  });
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
  it.each([
    ['a plain member', { canDelete: false }],
    ['an archived Channel', { status: 'archived' as const }],
    ["a conversation with another person's shared Agent", { sharedAgent: true }],
  ])('offers no invite to %s', (_, override) => {
    expect(canInviteMembers({ ...open, ...override })).toBe(false);
  });
});

describe('inviting from an open conversation', () => {
  const channel = {
    canDelete: true,
    id: 'chn_1',
    status: 'active',
    workspaceId: null,
  } as unknown as ChannelDetail['channel'];
  it('reads the shared Agent mark from the list row when the detail lacks it', () => {
    useChannelStore.setState({ listMap: { all: [{ ...channel, sharedAgent: true }] } } as never);
    expect(renderHook(() => useCanInviteMembers(channel)).result.current).toBe(false);
  });
  it('invites when the list row marks no shared Agent', () => {
    useChannelStore.setState({ listMap: { all: [channel] } } as never);
    expect(renderHook(() => useCanInviteMembers(channel)).result.current).toBe(true);
  });
});

describe('opening a Channel before its conversation loads', () => {
  it('stands in with the list row for the main conversation', () => {
    expect(showsListedShell({ loaded: false })).toBe(true);
  });
  it.each([
    ['once the conversation has loaded', { loaded: true }],
    ['when the load failed', { loaded: false, error: new Error('network unavailable') }],
    ['for a thread', { loaded: false, threadId: 'th_1' }],
    ['for an older page', { before: 42, loaded: false }],
  ])('has no stand-in %s', (_, state) => {
    expect(showsListedShell(state)).toBe(false);
  });
});
