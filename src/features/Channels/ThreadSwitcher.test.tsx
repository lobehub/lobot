/**
 * @vitest-environment happy-dom
 */
import { fireEvent, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { markThreadRead, useThreadReadStore } from './threadReads';
import { threadOwner, ThreadSwitchMenu } from './ThreadSwitcher';

vi.mock('./MemberAvatar', () => ({
  MemberAvatar: ({ member }: { member: { id: string } }) =>
    createElement('img', { 'alt': '', 'data-member': member.id }),
}));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('@lobehub/ui', () => ({
  Icon: () => createElement('i', { 'data-check': true }),
  // Renders the trigger and lists the menu flat so each item can be read and picked.
  DropdownMenu: ({ children, items }: { children?: unknown; items: any[] }) =>
    createElement(
      'div',
      {},
      children as never,
      createElement(
        'ul',
        {},
        items.map((item) =>
          createElement(
            'li',
            {
              key: item.key,
              onClick: item.onClick,
              role: 'menuitem',
            },
            item.label,
            item.extra,
          ),
        ),
      ),
    ),
}));

const members = [
  { actorType: 'user', id: 'mem_ann', status: 'active' },
  { actorType: 'agent', id: 'mem_cook', status: 'active' },
  { actorType: 'agent', id: 'mem_gone', status: 'left' },
];

const detail = {
  members,
  messages: [
    { content: 'Unify Channel members\nmore', id: 'msg_1' },
    { content: 'Old release notes', id: 'msg_3' },
  ],
  threads: [
    {
      followerMemberIds: ['mem_ann', 'mem_cook'],
      id: 'thr_1',
      rootMessageId: 'msg_1',
      status: 'active',
    },
    {
      followerMemberIds: ['mem_ann'],
      id: 'thr_2',
      rootMessageId: 'msg_2',
      status: 'active',
      title: 'Fix the release flow',
    },
    { id: 'thr_3', rootMessageId: 'msg_3', status: 'archived' },
    { id: 'thr_4', rootMessageId: 'msg_4', status: 'active' },
  ],
} as never;

const items = () =>
  screen.getAllByRole('menuitem').map((item) => ({
    checked: !!item.querySelector('[data-check]'),
    label: item.textContent,
  }));

const unreadRows = () =>
  screen
    .getAllByRole('menuitem')
    .filter((item) => item.querySelector('[aria-label="threadUnread"]'))
    .map((item) => item.textContent);

beforeEach(() => {
  useThreadReadStore.setState({ readAt: {}, since: 0 });
});

const avatars = () =>
  screen.getAllByRole('menuitem').map((item) => item.querySelector('img')?.dataset.member ?? null);

describe('threadOwner', () => {
  it('picks the first Agent following the thread over people', () => {
    expect(threadOwner({ followerMemberIds: ['mem_ann', 'mem_cook'] }, members as never)?.id).toBe(
      'mem_cook',
    );
  });

  it('falls back to a person, and skips members who left', () => {
    expect(threadOwner({ followerMemberIds: ['mem_gone', 'mem_ann'] }, members as never)?.id).toBe(
      'mem_ann',
    );
    expect(threadOwner({ followerMemberIds: ['mem_gone'] }, members as never)).toBeUndefined();
  });
});

describe('ThreadSwitchMenu', () => {
  it('lists the Channel’s live threads with the open one checked', () => {
    render(
      createElement(
        ThreadSwitchMenu,
        { detail, onOpen: vi.fn(), threadId: 'thr_2' },
        createElement('span', {}, 'title'),
      ),
    );

    expect(items()).toEqual([
      { checked: false, label: 'Unify Channel members' },
      { checked: true, label: 'Fix the release flow' },
      // Not loaded and untitled: numbered by its place in the Channel.
      { checked: false, label: 'thread 4' },
    ]);
    // Each thread shows who it belongs to; one nobody follows keeps an empty slot.
    expect(avatars()).toEqual(['mem_cook', 'mem_ann', null]);
  });

  it('keeps an archived thread listed while it is open', () => {
    render(
      createElement(
        ThreadSwitchMenu,
        { detail, onOpen: vi.fn(), threadId: 'thr_3' },
        createElement('span', {}, 'title'),
      ),
    );

    expect(items()).toContainEqual({ checked: true, label: 'Old release notes' });
  });

  it('opens another thread and ignores the open one', () => {
    const onOpen = vi.fn();
    render(
      createElement(
        ThreadSwitchMenu,
        { detail, onOpen, threadId: 'thr_2' },
        createElement('span', {}, 'title'),
      ),
    );

    fireEvent.click(screen.getByText('Fix the release flow'));
    expect(onOpen).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText('Unify Channel members'));
    expect(onOpen).toHaveBeenCalledWith('thr_1');
  });
});

describe('unread threads', () => {
  const replied = (iso: string) => ({ author: {}, content: '', createdAt: new Date(iso), id: iso });
  const withReplies = {
    ...(detail as object),
    threads: [
      { ...(detail as any).threads[0], lastReply: replied('2026-11-18T10:00:00Z') },
      { ...(detail as any).threads[1], lastReply: replied('2026-11-18T11:00:00Z') },
    ],
  } as never;
  const menu = (threadId: string) =>
    render(
      createElement(
        ThreadSwitchMenu,
        { detail: withReplies, onOpen: vi.fn(), threadId },
        createElement('span', {}, 'title'),
      ),
    );

  it('dots each other thread with unseen replies', () => {
    menu('thr_2');

    expect(unreadRows()).toEqual(['Unify Channel members']);
  });

  it('drops the dot once the newest reply is read', () => {
    markThreadRead('thr_1', '2026-11-18T10:00:00Z');
    menu('thr_2');

    expect(unreadRows()).toEqual([]);
  });
});
