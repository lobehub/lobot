import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import Header from './Header';

const mocks = vi.hoisted(() => ({
  channelsEnabled: true,
  navigate: vi.fn(),
  openCreateChannel: vi.fn(),
}));

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('@lobehub/ui', () => ({
  ActionIcon: ({
    'aria-label': ariaLabel,
    title,
    onClick,
  }: {
    'aria-label'?: string;
    'onClick'?: () => void;
    'title'?: string;
  }) => <button aria-label={ariaLabel || title} type={'button'} onClick={onClick} />,
  DropdownMenu: ({
    items,
  }: {
    items: { key: string; label: React.ReactNode; onClick?: () => void }[];
  }) => (
    <ul>
      {items.map((item) => (
        <li key={item.key}>
          <button aria-label={item.key} type={'button'} onClick={item.onClick}>
            {item.label}
          </button>
        </li>
      ))}
    </ul>
  ),
  Flexbox: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Icon: () => null,
  SearchBar: ({ placeholder }: { placeholder?: string }) => <input placeholder={placeholder} />,
  Text: () => null,
}));
vi.mock('@/features/Channels/CreateChannel', () => ({
  openCreateChannel: mocks.openCreateChannel,
}));
vi.mock('@/features/Channels/useChannelsEnabled', () => ({
  useChannelsEnabled: () => mocks.channelsEnabled,
}));
vi.mock('@/features/HomeSidebar/hooks', () => ({
  useCreateMenuItems: () => ({
    createAgentMenuItem: () => ({ key: 'newAgent', label: 'newAgent' }),
    createGroupChatMenuItem: () => ({ key: 'legacyGroupChat', label: 'newGroupChat' }),
    isLoading: false,
  }),
}));
vi.mock('@/features/Workspace/useWorkspaceAwareNavigate', () => ({
  useWorkspaceAwareNavigate: () => mocks.navigate,
}));
vi.mock('./SearchContext', () => ({ useMessageSearch: () => ({ query: '', setQuery: vi.fn() }) }));

const menuKeys = () =>
  [...screen.getByRole('list').querySelectorAll('button')].map((el) =>
    el.getAttribute('aria-label'),
  );

describe('MessageList Header create menu', () => {
  beforeEach(() => {
    mocks.channelsEnabled = true;
    vi.clearAllMocks();
  });

  it('offers creating an Agent or a Channel, the group a Channel is with Channels on', () => {
    render(<Header />);
    expect(menuKeys()).toEqual(['newAgent', 'newChannel']);

    fireEvent.click(screen.getByRole('button', { name: 'newChannel' }));
    expect(mocks.openCreateChannel).toHaveBeenCalledOnce();

    mocks.openCreateChannel.mock.calls[0][0]('chn_1');
    expect(mocks.navigate).toHaveBeenCalledWith('/channels/chn_1');
  });

  it('names the Channel entry for a Channel, and the legacy group the way WeChat does', () => {
    const { unmount } = render(<Header />);
    expect(screen.getByRole('button', { name: 'newChannel' }).textContent).toBe('create');
    unmount();

    mocks.channelsEnabled = false;
    render(<Header />);
    expect(screen.getByRole('button', { name: 'legacyGroupChat' }).textContent).toBe(
      'messageList.startGroupChat',
    );
  });

  it('keeps search as an icon until it is opened', () => {
    render(<Header />);

    expect(screen.queryByPlaceholderText('messageList.search')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'messageList.search' }));

    expect(screen.getByPlaceholderText('messageList.search')).toBeInTheDocument();
  });

  it('falls back to an Agent group where Channels are off', () => {
    mocks.channelsEnabled = false;
    render(<Header />);
    expect(menuKeys()).toEqual(['newAgent', 'legacyGroupChat']);
  });
});
