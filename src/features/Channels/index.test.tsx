import { fireEvent, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import ChannelPage from './index';

const mocks = vi.hoisted(() => ({
  channelId: 'chn_gone',
  close: vi.fn(),
  detail: undefined as object | undefined,
  error: undefined as unknown,
  searchParams: new URLSearchParams(),
  setSearchParams: vi.fn(),
  threadId: null as string | null,
  list: [] as Array<{ agentId: string | null; id: string; title: string }>,
}));

vi.mock('react-router', () => ({
  useParams: () => ({ channelId: mocks.channelId }),
  useSearchParams: () => [mocks.searchParams, mocks.setSearchParams],
}));
vi.mock('@/store/channel', () => ({
  channelActions: { useFetchDetail: () => ({ error: mocks.error }) },
  channelSelectors: {
    detail: () => () => mocks.detail,
    isUnconfirmed: () => () => false,
    list: () => mocks.list,
  },
  useChannelStore: (selector: (s: object) => unknown) => selector({}),
}));
vi.mock('@/store/agent', () => ({
  useAgentStore: (selector: (s: object) => unknown) => selector({ useHydrateAgentConfig: vi.fn() }),
}));
vi.mock('@/store/agent/selectors', () => ({
  agentSelectors: {
    getAgentMetaById: (agentId: string) => () =>
      agentId === 'agt_neko' ? { name: 'Side Neko', title: 'Magic cat companion' } : undefined,
  },
}));
vi.mock('@/store/chat', () => ({
  useChatStore: (selector: (s: object) => unknown) =>
    selector({ clearPortalStack: vi.fn(), openBrowser: vi.fn() }),
}));
vi.mock('./useThreadPanel', () => ({
  useThreadPanel: () => ({
    close: mocks.close,
    draft: null,
    pageThreadId: null,
    threadId: mocks.threadId,
  }),
}));
vi.mock('./usePortalPanel', () => ({
  channelBrowserSessionId: (id: string) => id,
  usePortalPanelOpen: () => false,
}));
vi.mock('./ChannelEmpty', () => ({
  ChannelEmpty: () => createElement('div', { 'data-testid': 'channel-empty' }),
}));
vi.mock('./ChannelConversation', () => ({
  ChannelConversation: ({ channelId }: { channelId: string }) =>
    createElement('div', { 'data-testid': `conversation:${channelId}` }),
}));
vi.mock('./PortalPanel', () => ({
  CHANNEL_ENTITY_PORTAL_SCOPE: 'channel',
  PortalPanel: () => null,
}));
vi.mock('./ReplyTopicPanel', () => ({ ReplyTopicPanel: () => null }));
vi.mock('./ThreadPanel', () => ({ THREAD_FLOAT_BREAKPOINT: 760, ThreadPanel: () => null }));
vi.mock('./MemberPanel', () => ({ MEMBER_FLOAT_BREAKPOINT: 640, MemberPanel: () => null }));
vi.mock('./AgentProfilePanel', () => ({
  AgentProfilePanel: () => createElement('div', { 'data-testid': 'agent-profile' }),
}));
vi.mock('./Settings/Panel', () => ({
  ChannelSettingsPanel: () => createElement('div', { 'data-testid': 'channel-settings' }),
}));
vi.mock('./MemberStatus', () => ({ ChannelMenu: () => null, MemberStatus: () => null }));
vi.mock('./ChannelHeaderTitle', () => ({
  ChannelHeaderTitle: ({
    onToggleAgentPanel,
    onToggleChannelSettings,
    title,
  }: {
    onToggleAgentPanel?: () => void;
    onToggleChannelSettings?: () => void;
    title?: unknown;
  }) => {
    const onClick = onToggleAgentPanel ?? onToggleChannelSettings;
    return createElement(onClick ? 'button' : 'span', onClick ? { onClick } : {}, title as never);
  },
}));
vi.mock('@/features/EntityLink/host', () => ({
  EntityLinkHostProvider: ({ children }: { children: unknown }) => children,
}));
vi.mock('@/features/NavHeader', () => ({
  default: ({ left, right }: { left: unknown; right: unknown }) =>
    createElement('header', null, left, right),
}));
vi.mock('./peerTitle', () => ({ channelTitle: () => 'General' }));
vi.mock('./ThreadBrowser', () => ({ ThreadsButton: () => null }));
vi.mock('./ChannelSearch', () => ({
  ChannelSearchBox: ({ onSearch }: { onSearch: (query: string) => void }) =>
    createElement('button', { onClick: () => onSearch('无限') }, 'search'),
  ChannelSearchPanel: () => null,
}));

describe('ChannelPage', () => {
  beforeEach(() => {
    mocks.channelId = 'chn_gone';
    mocks.error = undefined;
    mocks.list = [];
    mocks.detail = undefined;
    mocks.threadId = null;
    mocks.searchParams = new URLSearchParams();
    mocks.close.mockClear();
    mocks.setSearchParams.mockClear();
  });

  // A link to a Channel from another workspace showed a "# Channel" header over a 404 error.
  it('shows the blank logo page when the Channel is gone', () => {
    mocks.error = { data: { code: 'NOT_FOUND' } };

    render(createElement(ChannelPage));

    expect(screen.getByTestId('channel-empty')).toBeInTheDocument();
    expect(screen.queryByRole('banner')).not.toBeInTheDocument();
  });

  // A malformed id in a stale link failed validation and showed "request parameters invalid".
  it('shows the blank logo page for a malformed Channel id', () => {
    mocks.error = { data: { code: 'BAD_REQUEST' } };

    render(createElement(ChannelPage));

    expect(screen.getByTestId('channel-empty')).toBeInTheDocument();
  });

  it('names a loading conversation after its list row, not the generic title', () => {
    mocks.list = [{ agentId: null, id: 'chn_gone', title: 'General' }];

    render(createElement(ChannelPage));

    expect(screen.queryByTestId('channel-empty')).not.toBeInTheDocument();
    expect(screen.getByRole('banner')).toHaveTextContent('General');
    expect(screen.getByRole('banner')).not.toHaveTextContent('title');
  });

  it('shows only the Agent name without its description in the header', () => {
    mocks.list = [{ agentId: 'agt_neko', id: 'chn_gone', title: 'Side Neko' }];

    render(createElement(ChannelPage));

    expect(screen.getByRole('banner')).toHaveTextContent('Side Neko');
    expect(screen.getByRole('banner')).not.toHaveTextContent('Magic cat companion');
  });

  it('shows no role in a group conversation', () => {
    mocks.list = [{ agentId: null, id: 'chn_gone', title: 'General' }];

    render(createElement(ChannelPage));

    expect(screen.getByRole('banner')).toHaveTextContent(/^General$/);
  });

  // Searching closed the open thread, then closing the (already closed) settings rewrote the
  // URL from this render's params and put the thread back over the results.
  it('closes an open thread for a search without writing it back', () => {
    mocks.list = [{ agentId: null, id: 'chn_gone', title: 'General' }];
    mocks.detail = { channel: { id: 'chn_gone', status: 'active' }, members: [] };
    mocks.threadId = 'thd_open';

    render(createElement(ChannelPage));
    fireEvent.click(screen.getByRole('button', { name: 'search' }));

    expect(mocks.close).toHaveBeenCalled();
    expect(mocks.setSearchParams).not.toHaveBeenCalled();
  });

  // Switching from one Channel to another left the old conversation on screen, the new one
  // squeezed beside it as if it had opened in a thread.
  it('leaves nothing of the last Channel beside the next one', () => {
    mocks.channelId = 'chn_a';
    const { rerender } = render(createElement(ChannelPage));
    const stale = document.createElement('div');
    stale.dataset.testid = 'stale';
    screen.getByTestId('conversation:chn_a').parentElement!.append(stale);

    mocks.channelId = 'chn_b';
    rerender(createElement(ChannelPage));

    expect(screen.getByTestId('conversation:chn_b')).toBeTruthy();
    expect(screen.queryByTestId('conversation:chn_a')).toBeNull();
    expect(screen.queryByTestId('stale')).toBeNull();
  });

  it('opens Channel settings from a click on the group title and closes them on the next click', () => {
    mocks.list = [{ agentId: null, id: 'chn_gone', title: 'General' }];
    mocks.detail = {
      channel: { agentId: null, canDelete: true, id: 'chn_gone', status: 'active' },
      members: [],
    };

    const view = render(createElement(ChannelPage));
    fireEvent.click(screen.getByRole('button', { name: 'General' }));

    const open = mocks.setSearchParams.mock.calls[0][0] as (
      current: URLSearchParams,
    ) => URLSearchParams;
    expect(open(new URLSearchParams()).get('settings')).toBe('1');

    mocks.searchParams = new URLSearchParams('settings=1');
    mocks.setSearchParams.mockClear();
    view.rerender(createElement(ChannelPage));
    fireEvent.click(screen.getByRole('button', { name: 'General' }));

    const close = mocks.setSearchParams.mock.calls[0][0] as (
      current: URLSearchParams,
    ) => URLSearchParams;
    expect(close(new URLSearchParams('settings=1')).has('settings')).toBe(false);
  });

  it("opens the Agent profile from a click on the Agent's name and closes it on the next click", () => {
    mocks.list = [{ agentId: 'agt_neko', id: 'chn_gone', title: 'Side Neko' }];
    mocks.detail = {
      channel: { agentId: 'agt_neko', canDelete: true, id: 'chn_gone', status: 'active' },
      members: [{ agentId: 'agt_neko', id: 'mem_neko', name: 'Side Neko', status: 'active' }],
    };

    render(createElement(ChannelPage));
    fireEvent.click(screen.getByRole('button', { name: 'General' }));
    expect(screen.getByTestId('agent-profile')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'General' }));
    expect(screen.queryByTestId('agent-profile')).toBeNull();
  });

  it('does not turn a human private chat title into a Channel settings control', () => {
    mocks.list = [{ agentId: null, id: 'chn_gone', title: 'Ada' }];
    mocks.detail = {
      channel: {
        agentId: null,
        canDelete: true,
        id: 'chn_gone',
        peerUserId: 'usr_1',
        status: 'active',
      },
      members: [],
    };

    render(createElement(ChannelPage));
    expect(screen.queryByRole('button', { name: 'General' })).toBeNull();
    expect(screen.getByRole('banner')).toHaveTextContent('General');
  });
});
