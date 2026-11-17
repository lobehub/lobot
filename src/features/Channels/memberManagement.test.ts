import { describe, expect, it } from 'vitest';

import { callerMemberRole, canRemoveMember } from './memberManagement';

const group = {
  agentId: null,
  canDelete: true,
  peerUserId: null,
  status: 'active' as const,
};
const agent = { role: null, status: 'active' as const };

describe('canRemoveMember', () => {
  it('lets an admin remove an Agent or a member of a group Channel', () => {
    expect(canRemoveMember(group, agent, { isSelf: false, selfRole: 'admin' })).toBe(true);
    expect(
      canRemoveMember(
        group,
        { role: 'member', status: 'active' },
        { isSelf: false, selfRole: 'admin' },
      ),
    ).toBe(true);
  });

  it('never removes the owner, the caller, or someone already gone', () => {
    const options = { isSelf: false, selfRole: 'owner' as const };
    expect(canRemoveMember(group, { role: 'owner', status: 'active' }, options)).toBe(false);
    expect(canRemoveMember(group, { role: 'member', status: 'left' }, options)).toBe(false);
    expect(
      canRemoveMember(group, { role: 'member', status: 'active' }, { ...options, isSelf: true }),
    ).toBe(false);
  });

  it('leaves another admin to the owner', () => {
    const admin = { role: 'admin' as const, status: 'active' as const };
    expect(canRemoveMember(group, admin, { isSelf: false, selfRole: 'admin' })).toBe(false);
    expect(canRemoveMember(group, admin, { isSelf: false, selfRole: 'owner' })).toBe(true);
  });

  it('keeps direct conversations and non-admins out', () => {
    const options = { isSelf: false, selfRole: 'admin' as const };
    expect(canRemoveMember({ ...group, agentId: 'agt_1' }, agent, options)).toBe(false);
    expect(canRemoveMember({ ...group, peerUserId: 'user_2' }, agent, options)).toBe(false);
    expect(canRemoveMember({ ...group, canDelete: false }, agent, options)).toBe(false);
  });
});

describe('callerMemberRole', () => {
  const members = [
    { actorType: 'user' as const, role: 'owner' as const, userId: 'u1' },
    { actorType: 'agent' as const, role: null, userId: null },
    { actorType: 'user' as const, role: 'member' as const, userId: 'u2' },
  ];

  it("finds the caller's role among the people in the Channel", () => {
    expect(callerMemberRole(members, 'u2')).toBe('member');
    expect(callerMemberRole(members, 'u1')).toBe('owner');
  });

  it('is undefined for a non-member, no user, or no member list', () => {
    expect(callerMemberRole(members, 'u3')).toBeUndefined();
    expect(callerMemberRole(members, undefined)).toBeUndefined();
    expect(callerMemberRole(undefined, 'u1')).toBeUndefined();
  });
});
