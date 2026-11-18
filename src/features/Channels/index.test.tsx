import { render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import ChannelPage from './index';

const mocks = vi.hoisted(() => ({
  error: undefined as unknown,
  list: [] as Array<{ agentId: string | null; id: string; title: string }>,
}));

vi.mock('react-router', () => ({
  useParams: () => ({ channelId: 'chn_gone' }),
  useSearchParams: () => [new URLSearchParams(), vi.fn()],
}));
vi.mock('@/store/serverConfig', () => ({
  serverConfigSelectors: { enableChannels: () => true },
  useServerConfigStore: (selector: (s: object) => unknown) => selector({ serverConfigInit: true }),
}));
vi.mock('@/store/channel', () => ({
  channelActions: { useFetchDetail: () => ({ error: mocks.error }) },
  channelSelectors: {
    detail: () => () => undefined,
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
  useThreadPanel: () => ({ close: vi.fn(), draft: null, pageThreadId: null, threadId: null }),
}));
vi.mock('./usePortalPanel', () => ({
  channelBrowserSessionId: (id: string) => id,
  usePortalPanelOpen: () => false,
}));
vi.mock('./ChannelEmpty', () => ({
  ChannelEmpty: () => createElement('div', { 'data-testid': 'channel-empty' }),
}));
vi.mock('./ChannelConversation', () => ({ ChannelConversation: () => null }));
vi.mock('./PortalPanel', () => ({
  CHANNEL_ENTITY_PORTAL_SCOPE: 'channel',
  PortalPanel: () => null,
}));
vi.mock('./ReplyTopicPanel', () => ({ ReplyTopicPanel: () => null }));
vi.mock('./ThreadPanel', () => ({ THREAD_FLOAT_BREAKPOINT: 760, ThreadPanel: () => null }));
vi.mock('./MemberPanel', () => ({ MEMBER_FLOAT_BREAKPOINT: 640, MemberPanel: () => null }));
vi.mock('./AgentProfilePanel', () => ({ AgentProfilePanel: () => null }));
vi.mock('./MemberStatus', () => ({ ChannelMenu: () => null, MemberStatus: () => null }));
vi.mock('@/features/EntityLink/host', () => ({
  EntityLinkHostProvider: ({ children }: { children: unknown }) => children,
}));
vi.mock('@/features/NavHeader', () => ({
  default: ({ left }: { left: unknown }) => createElement('header', null, left),
}));

describe('ChannelPage', () => {
  beforeEach(() => {
    mocks.error = undefined;
    mocks.list = [];
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

  it("puts a direct conversation's Agent role after its name", () => {
    mocks.list = [{ agentId: 'agt_neko', id: 'chn_gone', title: 'Side Neko' }];

    render(createElement(ChannelPage));

    expect(screen.getByRole('banner')).toHaveTextContent('Side NekoMagic cat companion');
  });

  it('shows no role in a group conversation', () => {
    mocks.list = [{ agentId: null, id: 'chn_gone', title: 'General' }];

    render(createElement(ChannelPage));

    expect(screen.getByRole('banner')).toHaveTextContent(/^General$/);
  });
});
