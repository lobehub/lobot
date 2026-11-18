/**
 * @vitest-environment happy-dom
 */
import type { ChannelDetail, ChannelPublicMember } from '@lobot/types';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ChannelWelcome, welcomeCounterpart } from './ChannelWelcome';

const openSettings = vi.fn();
const openInviteMembers = vi.fn();

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: { name?: string }) =>
      options?.name ? `${key}:${options.name}` : key,
  }),
}));
vi.mock('@/store/user', () => ({
  useUserStore: (selector: (state: unknown) => unknown) => selector({}),
}));
vi.mock('@/store/user/selectors', () => ({
  userProfileSelectors: { userId: () => 'user-1' },
}));
vi.mock('./Settings/tabs', () => ({ useOpenChannelSettings: () => openSettings }));
vi.mock('./CreateChannel', () => ({
  openInviteMembers: (...args: unknown[]) => openInviteMembers(...args),
}));
vi.mock('./MemberAvatar', () => ({ MemberAvatar: () => null }));
vi.mock('./useChannelProjectName', () => ({
  useChannelProjectName: (projectId?: string | null) =>
    projectId === 'prj-1' ? 'lobe-editor' : undefined,
}));

const member = (overrides: Partial<ChannelPublicMember>) =>
  ({
    actorType: 'user',
    agentId: null,
    description: null,
    joinedAt: new Date(0),
    name: null,
    role: 'member',
    status: 'active',
    userId: null,
    userName: null,
    username: null,
    ...overrides,
  }) as ChannelPublicMember;

const self = member({ id: 'm-self', name: 'Me', role: 'owner', userId: 'user-1' });
const agent = member({
  actorType: 'agent',
  agentId: 'agent-1',
  description: 'Writes the code',
  id: 'm-agent',
  name: 'Cook',
});

const detail = (channel: Partial<ChannelDetail['channel']>, members: ChannelPublicMember[]) =>
  ({
    channel: {
      agentId: null,
      canDelete: false,
      id: 'ch-1',
      peerUserId: null,
      status: 'active',
      title: 'general',
      workspaceId: null,
      ...channel,
    },
    members,
  }) as unknown as ChannelDetail;

describe('ChannelWelcome', () => {
  it('introduces the Agent of a direct conversation and greets it', () => {
    const onGreet = vi.fn();
    render(
      <ChannelWelcome
        detail={detail({ agentId: 'agent-1', title: 'Cook' }, [self, agent])}
        onGreet={onGreet}
      />,
    );
    expect(screen.getByText('Writes the code')).toBeTruthy();
    expect(screen.getByText('welcome.direct:Cook')).toBeTruthy();
    fireEvent.click(screen.getByText('welcome.greet:Cook'));
    expect(onGreet).toHaveBeenCalledWith('welcome.greeting');
  });

  it('shows the other person’s username in a private chat', () => {
    const peer = member({ id: 'm-peer', userId: 'user-2', userName: 'Alice', username: 'alice' });
    const value = detail({ peerUserId: 'user-2', title: 'Alice' }, [self, peer]);
    expect(welcomeCounterpart(value, 'user-1')).toBe(peer);
    render(<ChannelWelcome detail={value} />);
    expect(screen.getByText('@alice')).toBeTruthy();
    expect(screen.queryByText('welcome.greet:Alice')).toBeNull();
  });

  it('welcomes a group without repeating its members, which the join line already lists', () => {
    render(<ChannelWelcome detail={detail({}, [self, agent])} />);
    expect(screen.getByText('welcome.groupTitle:general')).toBeTruthy();
    expect(screen.getByText('welcome.group:general')).toBeTruthy();
    expect(screen.queryByText('Cook')).toBeNull();
    expect(screen.queryByText('welcome.addMembers')).toBeNull();
  });

  it('gives admins the invite and settings actions', () => {
    render(<ChannelWelcome detail={detail({ canDelete: true }, [self, agent])} />);
    fireEvent.click(screen.getByText('welcome.addMembers'));
    expect(openInviteMembers).toHaveBeenCalledWith(
      expect.objectContaining({ agentIds: ['agent-1'], id: 'ch-1', peopleCount: 1 }),
    );
    fireEvent.click(screen.getByText('welcome.editChannel'));
    expect(openSettings).toHaveBeenCalled();
  });

  it("welcomes to a project's default Channel by the project's name", () => {
    render(<ChannelWelcome detail={detail({ projectId: 'prj-1', title: 'General' }, [self])} />);
    expect(screen.getByText('welcome.groupTitle:lobe-editor')).toBeTruthy();
    expect(screen.getByText('welcome.group:lobe-editor')).toBeTruthy();
  });
});
