import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type * as ContactStore from '@/store/contact';

import NavTabBar from './index';

const { contactState, useFetchRequests } = vi.hoisted(() => ({
  contactState: { requestsMap: {} as Record<string, object[]> },
  useFetchRequests: vi.fn(),
}));
let channelsEnabled = true;

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('@/business/client/hooks/useActiveWorkspaceSlug', () => ({
  useActiveWorkspaceSlug: () => null,
}));

vi.mock('@/features/Channels/useChannelsEnabled', () => ({
  useChannelsEnabled: () => channelsEnabled,
}));

vi.mock('@/features/MessageList/conversations', () => ({
  messagesUnreadCount: () => 0,
}));

vi.mock('@/features/User/UserAvatar', () => ({ default: () => null }));

vi.mock('@/hooks/useActiveLocation', () => ({
  useActiveLocation: () => ({ pathname: '/' }),
}));

vi.mock('@/store/channel', () => ({
  channelSelectors: { list: () => [] },
  useChannelStore: (selector: (s: object) => unknown) => selector({}),
}));

vi.mock('@/store/home', () => ({
  useHomeStore: (selector: (s: object) => unknown) => selector({}),
}));

vi.mock('@/store/home/selectors', () => ({
  homeAgentListSelectors: { allAgents: () => [] },
}));

vi.mock('@/store/contact', async (importOriginal) => {
  const actual = await importOriginal<typeof ContactStore>();
  return {
    contactActions: { useFetchRequests },
    contactSelectors: actual.contactSelectors,
    useContactStore: (selector: (s: typeof contactState) => unknown) => selector(contactState),
  };
});

vi.mock('./messagesTarget', () => ({
  ActiveChannelSync: () => null,
  useMessagesUrl: () => ({ activeChannelId: undefined, url: '/' }),
}));

vi.mock('./useCompactLayout', () => ({ useCompactLayout: () => false }));

vi.mock('./TabItem', () => ({
  default: ({
    badge,
    children,
    title,
  }: {
    badge?: number;
    children?: ReactNode;
    title: string;
  }) => (
    <div data-badge={badge ?? ''} data-testid={`tab-${title}`}>
      {children}
    </div>
  ),
}));

const request = (id: string, direction: 'incoming' | 'outgoing') => ({
  direction,
  id,
  user: { id: `user-${id}` },
});

describe('NavTabBar', () => {
  beforeEach(() => {
    channelsEnabled = true;
    contactState.requestsMap = {};
    useFetchRequests.mockClear();
  });

  it('shows the number of incoming friend requests on the Contacts tab', () => {
    contactState.requestsMap = {
      all: [request('a', 'incoming'), request('b', 'outgoing'), request('c', 'incoming')],
    };

    render(<NavTabBar />);

    expect(screen.getByTestId('tab-tab.contacts')).toHaveAttribute('data-badge', '2');
    expect(useFetchRequests).toHaveBeenCalledWith(true);
  });

  it('shows no Contacts badge when only my own requests are pending', () => {
    contactState.requestsMap = { all: [request('b', 'outgoing')] };

    render(<NavTabBar />);

    expect(screen.getByTestId('tab-tab.contacts')).toHaveAttribute('data-badge', '0');
  });

  it('does not fetch or count requests when Channels are off', () => {
    channelsEnabled = false;
    contactState.requestsMap = { all: [request('a', 'incoming')] };

    render(<NavTabBar />);

    expect(screen.getByTestId('tab-tab.contacts')).toHaveAttribute('data-badge', '0');
    expect(useFetchRequests).toHaveBeenCalledWith(false);
  });
});
