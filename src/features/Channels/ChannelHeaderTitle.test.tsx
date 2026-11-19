/**
 * @vitest-environment happy-dom
 */
import { fireEvent, render, screen } from '@testing-library/react';
import { cloneElement, createElement, type ReactElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ChannelHeaderTitle } from './ChannelHeaderTitle';
import { ChannelMenu } from './MemberStatus';

const { openAgent, openEnvironment, openSettings, showContextMenu } = vi.hoisted(() => ({
  openSettings: vi.fn(),
  openAgent: { current: vi.fn() as ((path?: string) => void) | undefined },
  openEnvironment: vi.fn(),
  showContextMenu: vi.fn(),
}));

vi.mock('lucide-react', () => ({
  Bot: () => null,
  FolderCog: () => null,
  Hash: (props: object) => createElement('svg', { ...props, 'data-testid': 'title-hash' }),
  MoreHorizontal: () => null,
  Settings: () => null,
  Users: () => null,
}));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('@lobehub/ui', () => ({
  ActionIcon: ({ title }: { title?: string }) => createElement('button', {}, title),
  Button: () => null,
  ContextMenuTrigger: ({
    children,
    items,
  }: {
    children: ReactElement;
    items: unknown[] | (() => unknown[]);
  }) =>
    // Match the real ContextMenuTrigger: clone its child without adding a layout box.
    // eslint-disable-next-line @eslint-react/no-clone-element
    cloneElement(children, {
      'data-testid': 'title-context',
      'onContextMenu': (event: { preventDefault: () => void }) => {
        event.preventDefault();
        showContextMenu(typeof items === 'function' ? items() : items);
      },
    } as object),
  cssVar: { colorTextDescription: '#999' },
  cx: (...classNames: Array<string | undefined>) => classNames.filter(Boolean).join(' '),
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
  Text: ({
    children,
    ellipsis: _ellipsis,
    weight: _weight,
    ...props
  }: {
    children?: unknown;
    ellipsis?: boolean;
    weight?: number;
  }) => createElement('span', props, children as never),
}));
vi.mock('@stylexjs/stylex', () => ({
  create: (tokens: object) => tokens,
  props: () => ({}),
}));
vi.mock('@/styles/electron', () => ({ electronStylish: { nodrag: 'nodrag' } }));
vi.mock('./Settings/tabs', () => ({ useOpenChannelSettings: () => openSettings }));
vi.mock('@/hooks/useCloseOnNavigate', () => ({ useCloseOnNavigate: () => 0 }));
vi.mock('./AgentEnvironment', () => ({ openChannelAgentEnvironment: openEnvironment }));
vi.mock('./InviteMembersButton', () => ({ InviteMembersButton: () => null }));
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
const contextKeys = () =>
  (showContextMenu.mock.calls[0][0] as Array<{ key?: string }>)
    .filter((item) => item?.key)
    .map((item) => item.key);

describe('ChannelHeaderTitle', () => {
  const onToggleAgentPanel = vi.fn();
  const onToggleChannelSettings = vi.fn();

  beforeEach(() => {
    onToggleAgentPanel.mockClear();
    onToggleChannelSettings.mockClear();
    openSettings.mockClear();
    showContextMenu.mockReset();
  });

  const renderTitle = (
    channel: Record<string, unknown> = {},
    toggles: {
      onToggleAgentPanel?: () => void;
      onToggleChannelSettings?: () => void;
      title?: string;
    } = {},
  ) =>
    render(
      createElement(ChannelHeaderTitle, {
        detail: detail(channel),
        showHash: !channel.agentId && !channel.peerUserId,
        title: toggles.title ?? 'General',
        onToggleAgentPanel: toggles.onToggleAgentPanel,
        onToggleChannelSettings: toggles.onToggleChannelSettings,
      }),
    );

  it('opens Agent settings from a left click on the Agent name and not from a right click', () => {
    renderTitle({}, { onToggleAgentPanel, title: 'Cook' });

    fireEvent.click(screen.getByRole('button', { name: 'Cook' }));
    expect(onToggleAgentPanel).toHaveBeenCalledTimes(1);

    fireEvent.contextMenu(screen.getByRole('button', { name: 'Cook' }));
    expect(onToggleAgentPanel).toHaveBeenCalledTimes(1);
    expect(onToggleChannelSettings).not.toHaveBeenCalled();
  });

  it('opens Channel settings from a left click on the Channel name, including the #', () => {
    renderTitle({ agentId: null }, { onToggleChannelSettings, title: 'General' });

    const title = screen.getByRole('button', { name: 'General' });
    fireEvent.click(screen.getByTestId('title-hash'));
    expect(onToggleChannelSettings).toHaveBeenCalledTimes(1);

    fireEvent.contextMenu(title);
    expect(onToggleChannelSettings).toHaveBeenCalledTimes(1);
  });

  it('reuses the "…" menu items for a right click on a group title', () => {
    const props = { detail: detail({ agentId: null }) };
    const view = render(createElement(ChannelMenu, props));
    const expected = menuKeys();
    view.unmount();

    renderTitle({ agentId: null }, { onToggleChannelSettings });
    fireEvent.contextMenu(screen.getByRole('button', { name: 'General' }));
    expect(contextKeys()).toEqual(expected);
    expect(expected).toEqual(['copyId', 'settings']);
  });

  it('reuses the "…" menu items for a right click on an Agent name', () => {
    const props = { detail: detail(), onToggleAgentPanel };
    const view = render(createElement(ChannelMenu, props));
    const expected = menuKeys();
    view.unmount();

    renderTitle({}, { onToggleAgentPanel, title: 'Cook' });
    fireEvent.contextMenu(screen.getByRole('button', { name: 'Cook' }));
    expect(contextKeys()).toEqual(expected);
    expect(expected).toEqual(['openAgent', 'environment', 'copyId', 'agentSettings']);
  });

  it('keeps a shared, read-only Agent name opening the existing profile, not Channel settings', () => {
    renderTitle(
      { canDelete: false, sharedAgent: { id: 'shared' } },
      { onToggleAgentPanel, title: 'Cook' },
    );

    fireEvent.click(screen.getByRole('button', { name: 'Cook' }));
    expect(onToggleAgentPanel).toHaveBeenCalledTimes(1);
    expect(onToggleChannelSettings).not.toHaveBeenCalled();
  });

  it('does not let a left click on a human private chat open Channel settings', () => {
    renderTitle({ agentId: null, peerUserId: 'usr_1' }, { onToggleChannelSettings, title: 'Ada' });

    expect(screen.queryByRole('button', { name: 'Ada' })).toBeNull();
    fireEvent.contextMenu(screen.getByText('Ada'));
    expect(contextKeys()).toEqual(['rename', 'copyId', 'archive', 'delete']);
    expect(onToggleChannelSettings).not.toHaveBeenCalled();
  });

  it('keeps the original sibling hash and Text layout across access changes and loading', () => {
    const view = render(
      createElement(ChannelHeaderTitle, {
        detail: detail({ agentId: null }),
        showHash: true,
        title: 'General',
        onToggleChannelSettings,
      }),
    );
    const assertOriginalLayout = () => {
      expect(view.container.children).toHaveLength(2);
      expect(view.container.children[0].tagName.toLowerCase()).toBe('svg');
      expect(view.container.children[1].tagName.toLowerCase()).toBe('span');
      expect(view.container.querySelector('button')).toBeNull();
    };
    assertOriginalLayout();
    view.rerender(
      createElement(ChannelHeaderTitle, {
        detail: detail({ agentId: null, canDelete: false }),
        showHash: true,
        title: 'General',
      }),
    );
    assertOriginalLayout();
    view.rerender(createElement(ChannelHeaderTitle, { showHash: true, title: 'General' }));
    assertOriginalLayout();
  });

  it('activates the original Text by Enter and Space without adding a button', () => {
    renderTitle({}, { onToggleAgentPanel, title: 'Cook' });
    const name = screen.getByRole('button', { name: 'Cook' });
    expect(name.tagName).toBe('SPAN');
    expect(name.tabIndex).toBe(0);
    expect(name.className).toContain('nodrag');
    fireEvent.keyDown(name, { key: 'Enter' });
    fireEvent.keyDown(name, { key: ' ' });
    expect(onToggleAgentPanel).toHaveBeenCalledTimes(2);
  });

  it('does not invent a context menu when the header has no "…" actions', () => {
    render(createElement(ChannelHeaderTitle, { title: 'General' }));

    expect(screen.queryByTestId('title-context')).toBeNull();
    expect(screen.queryByRole('button', { name: 'General' })).toBeNull();
    expect(screen.getByText('General')).toBeTruthy();
  });

  it('does not open Agent settings from the name when the profile cannot be shown', () => {
    renderTitle({}, { title: 'Cook' });

    expect(screen.queryByRole('button', { name: 'Cook' })).toBeNull();
    fireEvent.contextMenu(screen.getByText('Cook'));
    expect(contextKeys()).toEqual(['openAgent', 'environment', 'copyId']);
  });

  it('leaves a member who cannot manage a group able to right-click, but not to open settings', () => {
    renderTitle({ agentId: null, canDelete: false }, { onToggleChannelSettings, title: 'General' });

    expect(screen.queryByRole('button', { name: 'General' })).toBeNull();
    fireEvent.contextMenu(screen.getByText('General'));
    expect(contextKeys()).toEqual(['copyId']);
    expect(onToggleChannelSettings).not.toHaveBeenCalled();
  });
});
