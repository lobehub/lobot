/**
 * @vitest-environment happy-dom
 */
import { fireEvent, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { MemberList } from './MemberList';

const { setMemberMuted } = vi.hoisted(() => ({ setMemberMuted: vi.fn() }));

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('@lobehub/ui', () => ({
  ActionIcon: () => null,
  // Lists the menu flat so each action can be read and clicked.
  DropdownMenu: ({ items }: { items: any[] }) =>
    createElement(
      'ul',
      {},
      items.map((item) =>
        createElement('li', { key: item.key, onClick: item.onClick }, item.label),
      ),
    ),
  Flexbox: ({ children }: { children?: unknown }) => createElement('div', {}, children as never),
  Icon: () => null,
  Text: ({ children }: { children?: unknown }) => createElement('span', {}, children as never),
  toast: { error: vi.fn() },
  Tooltip: ({ children }: { children?: unknown }) => children,
}));
vi.mock('@/features/Workspace/useWorkspaceAwareNavigate', () => ({
  useWorkspaceAwareNavigate: () => vi.fn(),
}));
vi.mock('@/store/channel', () => ({ channelActions: { setMemberMuted } }));
vi.mock('@/store/user', () => ({ useUserStore: () => 'usr_me' }));
vi.mock('@/store/user/selectors', () => ({ userProfileSelectors: { userId: () => 'usr_me' } }));
vi.mock('./AgentEnvironment', () => ({ openChannelAgentEnvironment: vi.fn() }));
vi.mock('./MemberAvatar', () => ({ MemberAvatar: () => null }));
vi.mock('./MemberProfilePopup', () => ({
  MemberProfilePopup: ({ children }: { children?: unknown }) => children,
}));
vi.mock('./useMemberActions', () => ({ useRemoveMember: () => vi.fn() }));

const cook = {
  actorType: 'agent',
  agentId: 'agt_cook',
  id: 'mem_cook',
  name: 'Cook',
  status: 'active',
};
const detail = (channel: Record<string, unknown> = {}, member: Record<string, unknown> = {}) =>
  ({
    channel: { agentId: null, canDelete: true, id: 'chn_1', status: 'active', ...channel },
    members: [{ ...cook, ...member }],
  }) as never;

const menuLabels = () => screen.queryAllByRole('listitem').map((item) => item.textContent);

beforeEach(() => {
  setMemberMuted.mockReset().mockResolvedValue(undefined);
});

describe('MemberList Agent mute', () => {
  it('mutes an Agent from its menu', () => {
    render(createElement(MemberList, { detail: detail() }));

    fireEvent.click(screen.getByText('member.mute'));

    expect(setMemberMuted).toHaveBeenCalledWith('chn_1', 'mem_cook', true);
  });

  it('unmutes a muted Agent and says it replies only when @mentioned', () => {
    render(createElement(MemberList, { detail: detail({}, { muted: true }) }));

    expect(screen.getByText('member.muted')).toBeTruthy();
    fireEvent.click(screen.getByText('member.unmute'));

    expect(setMemberMuted).toHaveBeenCalledWith('chn_1', 'mem_cook', false);
  });

  it('offers no mute to a member who cannot manage the Channel', () => {
    render(createElement(MemberList, { detail: detail({ canDelete: false }) }));

    expect(menuLabels()).not.toContain('member.mute');
  });

  it('offers no mute in a direct conversation', () => {
    render(createElement(MemberList, { detail: detail({ agentId: 'agt_cook' }) }));

    expect(menuLabels()).not.toContain('member.mute');
  });

  it('offers no mute once the Channel is archived', () => {
    render(createElement(MemberList, { detail: detail({ status: 'archived' }) }));

    expect(menuLabels()).not.toContain('member.mute');
  });
});
