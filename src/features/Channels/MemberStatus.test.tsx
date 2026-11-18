/**
 * @vitest-environment happy-dom
 */
import { fireEvent, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { ChannelMenu, MemberStatus } from './MemberStatus';

const { openAgent, openEnvironment, openSettings } = vi.hoisted(() => ({
  openSettings: vi.fn(),
  openAgent: { current: vi.fn() as ((path?: string) => void) | undefined },
  openEnvironment: vi.fn(),
}));

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('@lobehub/ui', () => ({
  ActionIcon: ({ title }: { title?: string }) => createElement('button', {}, title),
  Button: () => null,
  // Lists the menu flat so each action can be read and clicked.
  DropdownMenu: ({ items }: { items: any[] }) =>
    createElement(
      'ul',
      {},
      items
        .filter((item) => item.key)
        .map((item) => createElement('li', { key: item.key, onClick: item.onClick }, item.key)),
    ),
  Flexbox: ({ children }: { children?: unknown }) => createElement('div', {}, children as never),
  Popover: () => null,
  Text: () => null,
}));
vi.mock('./Settings/tabs', () => ({ useOpenChannelSettings: () => openSettings }));
vi.mock('@/hooks/useCloseOnNavigate', () => ({ useCloseOnNavigate: () => 0 }));
vi.mock('./AgentEnvironment', () => ({ openChannelAgentEnvironment: openEnvironment }));
vi.mock('./InviteMembersButton', () => ({
  InviteMembersButton: () => createElement('button', {}, 'invite.title'),
}));
vi.mock('./FailureIndicator', () => ({ FailureIndicator: () => null }));
vi.mock('./MemberList', () => ({
  MemberList: () => null,
  StatusAvatar: () => null,
  useMemberEntries: ({ members }: { members: any[] }) =>
    members.map((member) => ({ member, name: member.name })),
}));
vi.mock('./useOpenDirectAgent', () => ({ useOpenDirectAgent: () => openAgent.current }));
vi.mock('./useChannelMenu', () => ({
  useChannelMenu: () => () => [
    { key: 'rename' },
    { key: 'copyId' },
    { key: 'archive' },
    { type: 'divider' },
    { key: 'delete' },
  ],
}));

const cook = { agentId: 'agt_cook', id: 'mem_cook', name: 'Cook', status: 'active' };
const detail = (channel: Record<string, unknown> = {}, member: Record<string, unknown> = {}) =>
  ({
    channel: {
      agentId: 'agt_cook',
      canDelete: true,
      id: 'chn_cook',
      status: 'active',
      workspaceId: null,
      ...channel,
    },
    members: [{ ...cook, ...member }],
  }) as never;

const menuKeys = () => screen.getAllByRole('listitem').map((item) => item.textContent);

describe('ChannelMenu in a direct conversation', () => {
  // The roster is hidden in a direct conversation, and it held the only way to set up a coding
  // Agent's device and working directory for the Channel.
  it('keeps the Agent environment setup in the menu', () => {
    render(createElement(ChannelMenu, { detail: detail() }));

    expect(menuKeys()).toEqual(['openAgent', 'environment', 'copyId']);
    fireEvent.click(screen.getByText('environment'));
    expect(openEnvironment).toHaveBeenCalledWith('chn_cook', expect.objectContaining(cook));
  });

  it('opens the Agent through its opener', () => {
    render(createElement(ChannelMenu, { detail: detail() }));

    fireEvent.click(screen.getByText('openAgent'));
    expect(openAgent.current).toHaveBeenCalled();
  });

  it('offers no Open Agent when the Agent cannot be opened', () => {
    const opener = openAgent.current;
    openAgent.current = undefined;
    render(createElement(ChannelMenu, { detail: detail() }));
    openAgent.current = opener;

    expect(menuKeys()).toEqual(['environment', 'copyId']);
  });

  it('offers no environment setup once the conversation is archived', () => {
    render(createElement(ChannelMenu, { detail: detail({ status: 'archived' }) }));

    expect(menuKeys()).not.toContain('environment');
  });

  it('offers no environment setup when the Agent has left', () => {
    render(createElement(ChannelMenu, { detail: detail({}, { status: 'removed' }) }));

    expect(menuKeys()).not.toContain('environment');
  });
});

describe('MemberStatus profile toggle', () => {
  const memberPanel = { id: 'panel', onToggle: () => {}, open: false };

  it('opens the Agent profile from a direct conversation', () => {
    render(createElement(MemberStatus, { detail: detail(), memberPanel }));

    expect(screen.getByText('profile.show')).toBeTruthy();
    expect(screen.queryByText('members.show')).toBeNull();
  });

  it('keeps the roster toggle in a group Channel', () => {
    render(createElement(MemberStatus, { detail: detail({ agentId: null }), memberPanel }));

    expect(screen.getByText('members.show')).toBeTruthy();
    expect(screen.queryByText('profile.show')).toBeNull();
  });
});

describe('ChannelMenu in a group Channel', () => {
  it('sends management to the settings instead of offering delete', () => {
    render(createElement(ChannelMenu, { detail: detail({ agentId: null }) }));

    expect(menuKeys()).toEqual(['copyId', 'settings']);
  });

  it('opens the settings beside the Channel', () => {
    render(createElement(ChannelMenu, { detail: detail({ agentId: null, projectId: 'prj_1' }) }));

    fireEvent.click(screen.getByText('settings'));

    expect(openSettings).toHaveBeenCalled();
  });

  it('offers no settings to a member who cannot manage the Channel', () => {
    render(createElement(ChannelMenu, { detail: detail({ agentId: null, canDelete: false }) }));

    expect(menuKeys()).toEqual(['copyId']);
  });
});

// The roster's own header adds members; the Channel header keeps only the roster toggle.
describe('MemberStatus invite', () => {
  const memberPanel = { id: 'panel', onToggle: () => {}, open: false };

  it('leaves inviting to the roster in a group Channel', () => {
    render(createElement(MemberStatus, { detail: detail({ agentId: null }), memberPanel }));

    expect(screen.queryByText('invite.title')).toBeNull();
    expect(screen.queryByText('more')).toBeNull();
  });

  it('keeps starting a group in a direct conversation, which has no roster', () => {
    render(createElement(MemberStatus, { detail: detail(), memberPanel }));

    expect(screen.getByText('invite.title')).toBeTruthy();
  });
});
