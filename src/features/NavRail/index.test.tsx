import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type * as ContactStore from '@/store/contact';

import NavTabBar from './index';

const { contactState, menu, useFetchRequests } = vi.hoisted(() => ({
  contactState: { requestsMap: {} as Record<string, object[]> },
  menu: {
    items: [] as { key?: string; type?: string }[],
    scopeItem: null as { key: string } | null,
  },
  useFetchRequests: vi.fn(),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('@lobehub/ui', () => ({
  ActionIcon: ({ 'aria-label': ariaLabel, title }: { 'aria-label'?: string; 'title'?: string }) => (
    <button aria-label={ariaLabel || title} type="button" />
  ),
  DropdownMenu: ({
    children,
    items,
  }: {
    children?: ReactNode;
    items: { key?: string; type?: string }[];
  }) => {
    menu.items = items;
    return <div>{children}</div>;
  },
  Flexbox: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  Icon: () => null,
  Text: ({ children }: { children?: ReactNode }) => <span>{children}</span>,
}));

vi.mock('@/styles/electron', () => ({
  electronStylish: { nodrag: '' },
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
vi.mock('./useScopeMenuItem', () => ({ useScopeMenuItem: () => menu.scopeItem }));

const request = (id: string, direction: 'incoming' | 'outgoing') => ({
  direction,
  id,
  user: { id: `user-${id}` },
});

describe('NavTabBar', () => {
  beforeEach(() => {
    contactState.requestsMap = {};
    menu.items = [];
    menu.scopeItem = null;
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

  it('shows the user name beside the avatar and has no Messages button', () => {
    render(<NavTabBar />);

    expect(screen.getByLabelText('tab.setting')).toHaveTextContent('Test User');
    expect(screen.getByLabelText('tab.contacts')).toBeInTheDocument();
    expect(screen.queryByLabelText('tab.messages')).not.toBeInTheDocument();
  });

  it('keeps only the scope switch and settings in the footer menu', () => {
    menu.scopeItem = { key: 'scope' };

    render(<NavTabBar />);

    expect(menu.items.map((item) => item.key ?? item.type)).toEqual([
      'scope',
      'divider',
      'settings',
    ]);
  });

  it('shows only settings in the footer menu when there is no scope to switch', () => {
    render(<NavTabBar />);

    expect(menu.items.map((item) => item.key ?? item.type)).toEqual(['settings']);
  });
});
