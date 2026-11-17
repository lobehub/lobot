/**
 * @vitest-environment happy-dom
 */
import { fireEvent, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { threadOwner, ThreadsButton, ThreadSwitchMenu } from './ThreadSwitcher';

vi.mock('./MemberAvatar', () => ({
  MemberAvatar: ({ member }: { member: { id: string } }) =>
    createElement('img', { 'alt': '', 'data-member': member.id }),
}));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('@lobehub/ui', () => ({
  ActionIcon: ({ title }: { title?: string }) => createElement('button', {}, title),
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
              'aria-checked': item.checked,
              'key': item.key,
              'onClick': () => item.onCheckedChange(!item.checked),
              'role': 'menuitemcheckbox',
            },
            item.label,
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
  screen.getAllByRole('menuitemcheckbox').map((item) => ({
    checked: item.getAttribute('aria-checked') === 'true',
    label: item.textContent,
  }));

const avatars = () =>
  screen
    .getAllByRole('menuitemcheckbox')
    .map((item) => item.querySelector('img')?.dataset.member ?? null);

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

describe('ThreadsButton', () => {
  it('opens a thread from the header', () => {
    const onOpen = vi.fn();
    render(createElement(ThreadsButton, { activeId: null, detail, onOpen }));

    expect(screen.getByText('threadList')).toBeTruthy();
    fireEvent.click(screen.getByText('Fix the release flow'));
    expect(onOpen).toHaveBeenCalledWith('thr_2');
  });

  it('stays out of a Channel without threads', () => {
    render(
      createElement(ThreadsButton, {
        activeId: null,
        detail: { messages: [], threads: [] } as never,
        onOpen: vi.fn(),
      }),
    );

    expect(screen.queryByText('threadList')).toBeNull();
  });
});
