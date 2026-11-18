/**
 * @vitest-environment happy-dom
 */
import { render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useChannelStore } from '@/store/channel';

import { InviteMembersButton } from './InviteMembersButton';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('@lobehub/ui', () => ({
  ActionIcon: ({ title }: { title?: string }) => createElement('button', {}, title),
}));
vi.mock('@/features/Workspace/useWorkspaceAwareNavigate', () => ({
  useWorkspaceAwareNavigate: () => vi.fn(),
}));
vi.mock('./CreateChannel', () => ({ openInviteMembers: vi.fn() }));
vi.mock('./MemberList', () => ({
  useMemberEntries: ({ members }: { members: any[] }) =>
    members.map((member) => ({ member, name: member.name })),
}));

const channel = {
  agentId: 'agt_shared',
  canDelete: true,
  id: 'chn_shared',
  status: 'active',
  workspaceId: null,
};
const detail = {
  channel,
  members: [{ agentId: 'agt_shared', id: 'mem_shared', name: 'Shared', status: 'active' }],
} as never;

describe('InviteMembersButton', () => {
  beforeEach(() => {
    useChannelStore.setState({ listMap: { all: [channel] } } as never);
  });

  it('invites from a direct conversation the member can manage', () => {
    render(createElement(InviteMembersButton, { detail }));
    expect(screen.getByText('invite.title')).toBeTruthy();
  });

  // Only the list row marks a conversation with another person's shared Agent, and inviting
  // there would start a group with an Agent the member does not own.
  it("offers no invite when the list row marks another person's shared Agent", () => {
    useChannelStore.setState({ listMap: { all: [{ ...channel, sharedAgent: true }] } } as never);
    render(createElement(InviteMembersButton, { detail }));
    expect(screen.queryByText('invite.title')).toBeNull();
  });
});
