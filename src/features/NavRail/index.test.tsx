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

vi.mock('@lobehub/ui', () => ({
  ActionIcon: ({ 'aria-label': ariaLabel, title }: { 'aria-label'?: string; 'title'?: string }) => (
    <button aria-label={ariaLabel || title} type="button" />
  ),
  DropdownMenu: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  Flexbox: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  Icon: () => null,
  Text: ({ children }: { children?: ReactNode }) => <span>{children}</span>,
}));

vi.mock('@/hooks/useSignOut', () => ({
  useSignOut: () => vi.fn(),
}));

vi.mock('@/styles/electron', () => ({
  electronStylish: { nodrag: '' },
}));

vi.mock('@/features/Channels/useChannelsEnabled', () => ({
  useChannelsEnabled: () => channelsEnabled,
}));

vi.mock('@/features/User/UserAvatar', () => ({ default: () => null }));

vi.mock('@/store/user', () => ({
  useUserStore: (selector: (s: object) => unknown) =>
    selector({ nickName: 'Test User', username: 'testuser' }),
}));

vi.mock('@/store/user/selectors', () => ({
  userProfileSelectors: {
    displayUserName: (s: { username?: string }) => s.username,
    nickName: (s: { nickName?: string }) => s.nickName,
  },
}));

vi.mock('@/store/contact', async (importOriginal) => {
  const actual = await importOriginal<typeof ContactStore>();
  return {
    contactActions: { useFetchRequests },
    contactSelectors: actual.contactSelectors,
    useContactStore: (selector: (s: typeof contactState) => unknown) => selector(contactState),
  };
});

vi.mock('@/business/client/hooks/useActiveWorkspaceId', () => ({
  useActiveWorkspaceId: () => null,
}));
vi.mock('./ContactsPopup', () => ({ default: () => null }));
vi.mock('./SettingsPopup', () => ({ default: () => null }));
vi.mock('./useScopeMenuItem', () => ({ useScopeMenuItem: () => null }));

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

  it('shows the number of incoming friend requests on the Contacts button', () => {
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

  it('shows the user name beside the avatar and has no Messages button', () => {
    render(<NavTabBar />);

    expect(screen.getByLabelText('tab.setting')).toHaveTextContent('Test User');
    expect(screen.getByLabelText('tab.contacts')).toBeInTheDocument();
    expect(screen.queryByLabelText('tab.messages')).not.toBeInTheDocument();
  });
});
