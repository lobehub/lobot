import { render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import DesktopHomeRoute from './DesktopHomeRoute';

const mocks = vi.hoisted(() => ({
  channels: undefined as unknown[] | undefined,
  detail: undefined as unknown,
  warmView: vi.fn(() => Promise.resolve()),
}));

vi.mock('react-router', () => ({
  Navigate: ({ to }: { to: string }) => createElement('div', { 'data-testid': 'redirect' }, to),
}));
vi.mock('@/features/Channels/ChannelEmpty', () => ({
  ChannelEmpty: () => createElement('div', { 'data-testid': 'channel-empty' }),
}));
vi.mock('@/store/channel', () => ({
  channelActions: {
    useFetchList: () => ({ isHydrated: mocks.channels !== undefined }),
    warmView: (channelId: string) => mocks.warmView(channelId),
  },
  channelSelectors: {
    detail: () => () => mocks.detail,
    list: () => mocks.channels,
  },
  useChannelStore: (selector: (s: object) => unknown) => selector({}),
}));

const channel = (id: string, updatedAt: string, lastMessageAt?: string, status = 'active') => ({
  createdAt: '2026-11-01T00:00:00Z',
  id,
  lastMessage: lastMessageAt ? { content: 'hi', createdAt: lastMessageAt } : null,
  status,
  updatedAt,
});

describe('DesktopHomeRoute', () => {
  beforeEach(() => {
    mocks.channels = undefined;
    mocks.detail = undefined;
    mocks.warmView.mockClear();
    mocks.warmView.mockImplementation(() => Promise.resolve());
  });

  // The server's first row was an untouched direct chat, so the Messages tab opened an empty page.
  it('opens the Channel with the latest message, not the first one the server lists', async () => {
    mocks.channels = [
      channel('chn_untouched', '2026-11-12T17:04:00Z'),
      channel('chn_older', '2026-11-12T16:16:00Z', '2026-11-12T16:16:00Z'),
      channel('chn_latest', '2026-11-12T16:40:00Z', '2026-11-12T16:40:00Z'),
      channel('chn_archived', '2026-11-13T00:00:00Z', '2026-11-13T00:00:00Z', 'archived'),
    ];

    render(createElement(DesktopHomeRoute));

    expect(screen.queryByTestId('channel-empty')).not.toBeInTheDocument();
    expect(await screen.findByTestId('redirect')).toHaveTextContent('chn_latest');
    expect(mocks.warmView).toHaveBeenCalledWith('chn_latest');
  });

  // The saved page is already in memory, so the conversation opens on the first frame.
  it('opens at once when the latest conversation is already in memory', () => {
    mocks.channels = [channel('chn_latest', '2026-11-12T16:40:00Z', '2026-11-12T16:40:00Z')];
    mocks.detail = { channel: { id: 'chn_latest' } };

    render(createElement(DesktopHomeRoute));

    expect(screen.getByTestId('redirect')).toHaveTextContent('chn_latest');
  });

  it('opens the most recently active Channel when none has a message yet', async () => {
    mocks.channels = [
      channel('chn_a', '2026-11-10T00:00:00Z'),
      channel('chn_b', '2026-11-12T00:00:00Z'),
    ];

    render(createElement(DesktopHomeRoute));

    expect(await screen.findByTestId('redirect')).toHaveTextContent('chn_b');
  });

  it('shows nothing while the list is still being read', () => {
    mocks.channels = undefined;

    const { container } = render(createElement(DesktopHomeRoute));

    expect(screen.queryByTestId('redirect')).not.toBeInTheDocument();
    expect(screen.queryByTestId('channel-empty')).not.toBeInTheDocument();
    expect(container).toBeEmptyDOMElement();
  });

  it('shows the blank logo page without any Channel', () => {
    mocks.channels = [];

    render(createElement(DesktopHomeRoute));

    expect(screen.queryByTestId('redirect')).not.toBeInTheDocument();
    expect(screen.getByTestId('channel-empty')).toBeInTheDocument();
  });
});
