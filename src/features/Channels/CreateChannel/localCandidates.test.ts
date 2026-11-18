import type { ChannelPublicMember } from '@lobot/types';
import { describe, expect, it } from 'vitest';

import type { WorkspaceMemberWithProfile } from '@/business/client/hooks/useWorkspaceMembers';

import { activeUserIds, localUserCandidates } from './localCandidates';

const member = (
  userId: string,
  fullName: string | null,
  extra: Partial<WorkspaceMemberWithProfile> = {},
) =>
  ({
    deletedAt: null,
    user: { avatar: `${userId}.png`, fullName, username: `${userId}-handle` },
    userId,
    ...extra,
  }) as WorkspaceMemberWithProfile;

describe('localUserCandidates', () => {
  const roster = [
    member('u3', 'Neko'),
    member('u1', 'AmAzing-'),
    member('u2', null),
    member('u4', 'Bryan', { deletedAt: new Date() }),
    member('u5', 'Kermit'),
  ];

  it('mirrors the server: active, not excluded, sorted by name with unnamed last', () => {
    expect(localUserCandidates(roster, new Set(['u5']), '').map((person) => person.userId)).toEqual(
      ['u1', 'u3', 'u2'],
    );
  });

  it('searches full names and usernames case-insensitively', () => {
    expect(localUserCandidates(roster, new Set(), 'neko').map((p) => p.userId)).toEqual(['u3']);
    expect(localUserCandidates(roster, new Set(), 'U2-HAN').map((p) => p.userId)).toEqual(['u2']);
  });

  it('keeps the profile fields the picker renders', () => {
    expect(localUserCandidates([member('u1', 'A')], new Set(), '')).toEqual([
      { avatar: 'u1.png', fullName: 'A', userId: 'u1', username: 'u1-handle' },
    ]);
  });
});

describe('activeUserIds', () => {
  it('lists only people still in the Channel', () => {
    const members = [
      { actorType: 'user', status: 'active', userId: 'u1' },
      { actorType: 'user', status: 'left', userId: 'u2' },
      { actorType: 'agent', status: 'active', userId: 'u3' },
    ] as ChannelPublicMember[];
    expect(activeUserIds(members)).toEqual(['u1']);
  });
});
