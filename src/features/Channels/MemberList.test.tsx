/**
 * @vitest-environment happy-dom
 */
import { fireEvent, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { MemberList } from './MemberList';

const { setMemberMuted, showContextMenu } = vi.hoisted(() => ({
  setMemberMuted: vi.fn(),
  showContextMenu: vi.fn(),
}));

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
  Flexbox: ({
    children,
    onContextMenu,
  }: {
    children?: unknown;
    onContextMenu?: (event: { preventDefault: () => void }) => void;
  }) => createElement('div', { onContextMenu }, children as never),
  showContextMenu,
  Icon: () => null,
  Text: ({ children }: { children?: unknown }) => createElement('span', {}, children as never),
  toast: { error: vi.fn() },
  // Shows the hover content inline so its cards can be read and clicked.
  Popover: ({ children, content }: { children?: unknown; content?: unknown }) =>
    createElement('div', {}, children as never, content as never),
}));
vi.mock('@/features/Workspace/useWorkspaceAwareNavigate', () => ({
  useWorkspaceAwareNavigate: () => vi.fn(),
}));
vi.mock('@/store/channel', () => ({
  channelActions: { setMemberMuted },
  channelSelectors: { listed: () => () => undefined },
  useChannelStore: (selector: (state: unknown) => unknown) => selector({}),
}));
vi.mock('./threadReads', () => ({
  useMentionedThreadIds: () => new Set(),
  useUnreadThreadIds: () => new Set(),
}));
vi.mock('./ThreadBrowser', () => ({
  browseThreads: (detail: { threads?: { id: string; title: string }[] }) =>
    (detail.threads ?? []).map((thread) => ({ thread, title: thread.title })),
  ThreadCard: ({ entry, onOpen }: { entry: { title: string }; onOpen: () => void }) =>
    createElement('button', { onClick: onOpen }, entry.title),
}));
vi.mock('@/store/user', () => ({ useUserStore: () => 'usr_me' }));
vi.mock('@/store/user/selectors', () => ({ userProfileSelectors: { userId: () => 'usr_me' } }));
vi.mock('./AgentEnvironment', () => ({ openChannelAgentEnvironment: vi.fn() }));
vi.mock('./MemberAvatar', () => ({ MemberAvatar: () => null }));
vi.mock('./MemberProfilePopup', () => ({
  MemberProfilePopup: ({
    children,
    extra,
    onOpenChange,
    open,
    trigger,
  }: {
    children?: unknown;
    extra?: unknown;
    onOpenChange?: (open: boolean) => void;
    open?: boolean;
    trigger?: string;
  }) =>
    createElement(
      'div',
      {
        'data-open': String(!!open),
        'data-trigger': trigger ?? 'hover',
        'onClick': () => onOpenChange?.(!open),
      },
      children as never,
      extra as never,
    ),
}));
vi.mock('./useMemberActions', () => ({ useRemoveMember: () => vi.fn() }));
vi.mock('@/features/ContactList/useAgentPresence', () => ({ useAgentPresence: () => undefined }));
vi.mock('@/features/ContactList/AgentPresenceBadge', () => ({ presenceDotStyles: () => [] }));

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
  showContextMenu.mockReset();
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

  it('marks a muted Agent right after its name, also while it works', () => {
    render(
      createElement(MemberList, {
        detail: {
          ...detail({}, { muted: true }),
          jobs: [{ id: 'job_1', memberId: 'mem_cook', status: 'running', threadId: null }],
        },
      }),
    );

    expect(screen.getByText('member.muted').parentElement?.textContent).toBe('Cookmember.muted');
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

describe('MemberList busy member', () => {
  const running = (id: string, threadId: string | null) => ({
    id,
    memberId: 'mem_cook',
    status: 'running',
    threadId,
  });
  const busy = {
    ...detail(),
    jobs: [running('job_1', 'thr_a'), running('job_2', 'thr_b'), running('job_3', null)],
    threads: [
      { id: 'thr_a', title: 'Quota' },
      { id: 'thr_b', title: 'Import' },
      { id: 'thr_c', title: 'Idle' },
    ],
  } as never;

  it('lists the Threads it works in as cards that open them', () => {
    const onOpenThread = vi.fn();
    render(createElement(MemberList, { detail: busy, onOpenThread }));

    expect(screen.getByText('main')).toBeTruthy();
    expect(screen.queryByText('Idle')).toBeNull();
    fireEvent.click(screen.getByText('Import'));

    expect(onOpenThread).toHaveBeenCalledWith('thr_b');
  });

  it('puts that work in the profile card instead of a second popup', () => {
    const onOpenThread = vi.fn();
    render(createElement(MemberList, { detail: busy, onOpenThread, selectable: true }));

    const card = screen.getByRole('button', { name: /Cook/ }).closest('[data-trigger="click"]');
    expect(card?.textContent).toContain('Import');
    expect(screen.getAllByText('Import')).toHaveLength(1);
    fireEvent.click(screen.getByText('Quota'));

    expect(onOpenThread).toHaveBeenCalledWith('thr_a');
  });

  it('shows the one Thread it works in on hover too', () => {
    const onOpenThread = vi.fn();
    const single = { ...busy, jobs: [running('job_1', 'thr_a')] } as never;
    render(createElement(MemberList, { detail: single, onOpenThread }));

    expect(screen.queryByText('main')).toBeNull();
    fireEvent.click(screen.getByText('Quota'));

    expect(onOpenThread).toHaveBeenCalledWith('thr_a');
  });
});

describe('MemberList selection', () => {
  it('opens the card when a row is selected and closes it when selected again', () => {
    render(createElement(MemberList, { detail: detail(), selectable: true }));

    const row = screen.getByRole('button', { name: /Cook/ });
    expect(row.closest('[data-trigger="click"]')?.getAttribute('data-open')).toBe('false');

    fireEvent.click(row);
    expect(row.closest('[data-open="true"]')).toBeTruthy();

    fireEvent.click(row);
    expect(row.closest('[data-open="false"]')).toBeTruthy();
  });

  it('opens the more actions from a right click and closes the card', () => {
    render(createElement(MemberList, { detail: detail(), selectable: true }));

    const row = screen.getByRole('button', { name: /Cook/ });
    fireEvent.click(row);
    fireEvent.contextMenu(row);

    expect(row.closest('[data-open="false"]')).toBeTruthy();
    const items = showContextMenu.mock.calls[0][0].map((item: { key: string }) => item.key);
    expect(items).toContain('mute');
    expect(items).toContain('open');
  });
});
