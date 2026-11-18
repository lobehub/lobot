/**
 * @vitest-environment happy-dom
 */
import { fireEvent, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useChannelStore } from '@/store/channel';
import { userProfileSelectors } from '@/store/user/selectors';

import { browseThreads, ThreadBrowser, ThreadsButton } from './ThreadBrowser';
import { useThreadReadStore } from './threadReads';

vi.mock('./MemberAvatar', () => ({
  MemberAvatar: ({ member }: { member: { id: string } }) =>
    createElement('img', { 'alt': '', 'data-member': member.id }),
}));
vi.mock('@/hooks/useCloseOnNavigate', () => ({ useCloseOnNavigate: () => 0 }));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: { count?: number }) =>
      options?.count === undefined ? key : `${key}:${options.count}`,
  }),
}));
vi.mock('@lobehub/ui', () => ({
  ActionIcon: ({ title }: { title?: string }) => createElement('button', {}, title),
  Avatar: () => createElement('i'),
  Icon: () => createElement('i'),
  // Shows the trigger and the panel at once so both can be read.
  Popover: ({ children, content }: { children?: unknown; content?: unknown }) =>
    createElement('div', {}, children as never, content as never),
  SearchBar: ({ onChange, placeholder, value }: any) =>
    createElement('input', { onChange, placeholder, value }),
  Segmented: () => createElement('div'),
}));

const replied = (iso: string, content = '') => ({
  author: { avatar: null, id: 'mem_cook', name: 'Cook', type: 'agent' },
  content,
  createdAt: new Date(iso),
  id: iso,
});

const detail = {
  channel: { id: 'chn_1' },
  members: [
    { actorType: 'agent', id: 'mem_cook', status: 'active' },
    { actorType: 'user', id: 'mem_me', status: 'active', userId: 'user_me' },
  ],
  messages: [{ content: 'Unify Channel members', id: 'msg_1' }],
  threads: [
    {
      followerMemberIds: ['mem_cook', 'mem_me'],
      createdAt: new Date('2026-11-17T12:00:00Z'),
      id: 'thr_1',
      lastReply: replied('2026-11-18T09:00:00Z', 'Members are unified'),
      rootMessageId: 'msg_1',
      status: 'active',
    },
    {
      followerMemberIds: ['mem_me'],
      createdAt: new Date('2026-11-16T12:00:00Z'),
      id: 'thr_2',
      lastReply: replied('2026-11-18T11:00:00Z', 'Release **fixed**'),
      rootMessageId: 'msg_2',
      status: 'active',
      title: 'Fix the release flow',
    },
    { followerMemberIds: [], id: 'thr_3', rootMessageId: 'msg_3', status: 'archived' },
  ],
} as never;

const browse = (
  query = '',
  activeId: string | null = null,
  unread: string[] = [],
  mentioned: string[] = [],
) =>
  browseThreads(detail, {
    activeId,
    fallbackTitle: (index) => `thread ${index + 1}`,
    mentionedIds: new Set(mentioned),
    query,
    unreadIds: new Set(unread),
  });

beforeEach(() => {
  vi.spyOn(userProfileSelectors, 'userId').mockReturnValue('user_me');
  useThreadReadStore.setState({ readAt: {}, since: 0 });
  useChannelStore.setState({ listMap: {} } as never);
});

describe('browseThreads', () => {
  it('lists live threads newest activity first, then archived ones', () => {
    expect(browse().map((entry) => [entry.title, entry.archived])).toEqual([
      ['Fix the release flow', false],
      ['Unify Channel members', false],
      ['thread 3', true],
    ]);
  });

  it('orders by when threads were opened when asked to', () => {
    const entries = browseThreads(detail, {
      activeId: null,
      fallbackTitle: (index) => `thread ${index + 1}`,
      query: '',
      sort: 'created',
      unreadIds: new Set(),
    });

    expect(entries.map((entry) => entry.thread.id)).toEqual(['thr_1', 'thr_2', 'thr_3']);
  });

  it('never marks an archived thread unread', () => {
    expect(browse('thread 3', null, ['thr_3'])[0].unread).toBe(false);
  });

  it('searches the title and the last reply as plain text', () => {
    expect(browse('UNIFY').map((entry) => entry.thread.id)).toEqual(['thr_1']);
    expect(browse('release fixed').map((entry) => entry.thread.id)).toEqual(['thr_2']);
    expect(browse('nothing like it')).toEqual([]);
  });

  it('marks a thread that @mentioned the person, but not the open or an archived one', () => {
    const entries = browse('', 'thr_1', [], ['thr_1', 'thr_2', 'thr_3']);

    expect(entries.map(({ mentioned, thread }) => [thread.id, mentioned])).toEqual([
      ['thr_2', true],
      ['thr_1', false],
      ['thr_3', false],
    ]);
  });

  it('never marks the open thread unread', () => {
    const entries = browse('', 'thr_1', ['thr_1', 'thr_2']);

    expect(entries.map(({ thread, unread }) => [thread.id, unread])).toEqual([
      ['thr_2', true],
      ['thr_1', false],
      ['thr_3', false],
    ]);
  });
});

describe('ThreadBrowser', () => {
  it('shows a count, the last reply, and a red dot on unread threads', () => {
    render(createElement(ThreadBrowser, { activeId: null, detail, onOpen: vi.fn() }));

    expect(screen.getByText('threadBrowser.count:3')).toBeTruthy();
    expect(screen.getByText('Release fixed')).toBeTruthy();
    expect(screen.getAllByRole('img', { name: 'threadUnread' })).toHaveLength(2);
  });

  it('puts an @ pill on a thread whose mention of the person is unseen', () => {
    useChannelStore.setState({
      listMap: {
        all: [
          {
            id: 'chn_1',
            threadMentions: [{ createdAt: new Date('2026-11-18T10:00:00Z'), threadId: 'thr_1' }],
          },
        ],
      },
    } as never);
    render(createElement(ThreadBrowser, { activeId: null, detail, onOpen: vi.fn() }));

    expect(screen.getAllByRole('img', { name: 'threadMentioned' })).toHaveLength(1);
  });

  it('groups archived threads at the bottom', () => {
    render(createElement(ThreadBrowser, { activeId: null, detail, onOpen: vi.fn() }));

    const group = screen.getByText('archivedGroup:1');
    const live = screen.getByText('Unify Channel members');
    const archived = screen.getByText('thread 3');
    expect(live.compareDocumentPosition(group) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(group.compareDocumentPosition(archived) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('filters as the person types and opens the picked thread', () => {
    const onOpen = vi.fn();
    render(createElement(ThreadBrowser, { activeId: null, detail, onOpen }));

    fireEvent.change(screen.getByPlaceholderText('threadBrowser.search'), {
      target: { value: 'unify' },
    });
    expect(screen.getByText('threadBrowser.matches:1')).toBeTruthy();
    expect(screen.queryByText('Fix the release flow')).toBeNull();

    fireEvent.click(screen.getByText('Unify Channel members'));
    expect(onOpen).toHaveBeenCalledWith('thr_1');
  });
});

describe('ThreadsButton', () => {
  it('labels the button with the unread count', () => {
    render(createElement(ThreadsButton, { activeId: 'thr_1', detail, onOpen: vi.fn() }));

    expect(screen.getByText('threadListUnread:1')).toBeTruthy();
  });

  it('shows the unread count as a badge instead of a dot', () => {
    const { container } = render(
      createElement(ThreadsButton, { activeId: 'thr_1', detail, onOpen: vi.fn() }),
    );

    expect(container.querySelector('[aria-hidden]')?.textContent).toBe('1');
  });

  it('stays out of a Channel without threads', () => {
    render(
      createElement(ThreadsButton, {
        activeId: null,
        detail: { channel: { id: 'chn_2' }, members: [], messages: [], threads: [] } as never,
        onOpen: vi.fn(),
      }),
    );

    expect(screen.queryByText('threadList')).toBeNull();
  });
});
