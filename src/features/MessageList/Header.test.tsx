import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import Header from './Header';

const mocks = vi.hoisted(() => ({
  addFriend: vi.fn(),
  channelsEnabled: true,
  createAgent: vi.fn(),
  createGroupChat: vi.fn(),
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
vi.mock('./useCreateActions', () => ({
  useCreateActions: () => ({
    addFriend: mocks.addFriend,
    channelsEnabled: mocks.channelsEnabled,
    createAgent: mocks.createAgent,
    createGroupChat: mocks.createGroupChat,
    isLoading: false,
  }),
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

  it('offers only a new Agent, a new group chat and adding a friend', () => {
    render(<Header />);
    expect(menuKeys()).toEqual(['newAgent', 'newChannel', 'addFriend']);
    expect(screen.getByRole('list').textContent).toBe(
      'messageList.newAgentmessageList.newGroupChatmessageList.addFriend',
    );

    fireEvent.click(screen.getByRole('button', { name: 'newAgent' }));
    fireEvent.click(screen.getByRole('button', { name: 'newChannel' }));
    fireEvent.click(screen.getByRole('button', { name: 'addFriend' }));
    expect(mocks.createAgent).toHaveBeenCalledOnce();
    expect(mocks.createGroupChat).toHaveBeenCalledOnce();
    expect(mocks.addFriend).toHaveBeenCalledOnce();
  });

  it('keeps search as an icon until it is opened', () => {
    render(<Header />);

    expect(screen.queryByPlaceholderText('messageList.search')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'messageList.search' }));

    expect(screen.getByPlaceholderText('messageList.search')).toBeInTheDocument();
  });

  it('keeps the same three entries where Channels are off', () => {
    mocks.channelsEnabled = false;
    render(<Header />);
    expect(menuKeys()).toEqual(['newAgent', 'newGroupChat', 'addFriend']);
  });
});
