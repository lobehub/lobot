/**
 * @vitest-environment happy-dom
 */
import { fireEvent, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

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
}));

const replied = (iso: string, content = '') => ({
  author: { avatar: null, id: 'mem_cook', name: 'Cook', type: 'agent' },
  content,
  createdAt: new Date(iso),
  id: iso,
});

const detail = {
  members: [{ actorType: 'agent', id: 'mem_cook', status: 'active' }],
  messages: [{ content: 'Unify Channel members', id: 'msg_1' }],
  threads: [
    {
      followerMemberIds: ['mem_cook'],
      id: 'thr_1',
      lastReply: replied('2026-11-18T09:00:00Z', 'Members are unified'),
      rootMessageId: 'msg_1',
      status: 'active',
    },
    {
      followerMemberIds: [],
      id: 'thr_2',
      lastReply: replied('2026-11-18T11:00:00Z', 'Release **fixed**'),
      rootMessageId: 'msg_2',
      status: 'active',
      title: 'Fix the release flow',
    },
    { followerMemberIds: [], id: 'thr_3', rootMessageId: 'msg_3', status: 'archived' },
  ],
} as never;

const browse = (query = '', activeId: string | null = null, unread: string[] = []) =>
  browseThreads(detail, {
    activeId,
    fallbackTitle: (index) => `thread ${index + 1}`,
    query,
    unreadIds: new Set(unread),
  });

beforeEach(() => {
  useThreadReadStore.setState({ readAt: {}, since: 0 });
});

describe('browseThreads', () => {
  it('lists live threads newest activity first', () => {
    expect(browse().map((entry) => entry.title)).toEqual([
      'Fix the release flow',
      'Unify Channel members',
    ]);
  });

  it('searches the title and the last reply as plain text', () => {
    expect(browse('UNIFY').map((entry) => entry.thread.id)).toEqual(['thr_1']);
    expect(browse('release fixed').map((entry) => entry.thread.id)).toEqual(['thr_2']);
    expect(browse('nothing like it')).toEqual([]);
  });

  it('never marks the open thread unread', () => {
    const entries = browse('', 'thr_1', ['thr_1', 'thr_2']);

    expect(entries.map(({ thread, unread }) => [thread.id, unread])).toEqual([
      ['thr_2', true],
      ['thr_1', false],
    ]);
  });
});

describe('ThreadBrowser', () => {
  it('shows a count, the last reply, and a red dot on unread threads', () => {
    render(createElement(ThreadBrowser, { activeId: null, detail, onOpen: vi.fn() }));

    expect(screen.getByText('threadBrowser.count:2')).toBeTruthy();
    expect(screen.getByText('Release fixed')).toBeTruthy();
    expect(screen.getAllByRole('img', { name: 'threadUnread' })).toHaveLength(2);
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

  it('stays out of a Channel without threads', () => {
    render(
      createElement(ThreadsButton, {
        activeId: null,
        detail: { members: [], messages: [], threads: [] } as never,
        onOpen: vi.fn(),
      }),
    );

    expect(screen.queryByText('threadList')).toBeNull();
  });
});
