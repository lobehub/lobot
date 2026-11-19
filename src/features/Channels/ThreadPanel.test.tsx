/**
 * @vitest-environment happy-dom
 */
import type { ChannelDetail } from '@lobot/types';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ThreadPanel } from './ThreadPanel';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('@lobehub/ui', () => ({
  ActionIcon: ({ onClick, title }: { onClick?: () => void; title?: string }) =>
    createElement('button', { 'aria-label': title, onClick }),
  ContextMenuTrigger: ({ children }: { children?: ReactNode }) => children,
  cssVar: {},
  // Lists the menu flat beside its trigger so its items can be read.
  DropdownMenu: ({ children, items }: { children?: ReactNode; items: any[] }) =>
    createElement(
      'div',
      { 'data-testid': 'more-menu' },
      children,
      items.map((item, index) =>
        createElement('span', { key: item.key ?? index, role: 'menuitem' }, item.key ?? item.type),
      ),
    ),
  Flexbox: ({ children }: { children?: ReactNode }) => createElement('div', {}, children),
  Icon: () => null,
  Text: ({ children }: { children?: ReactNode }) => createElement('span', {}, children),
}));
vi.mock('@/features/NavHeader', () => ({
  default: ({ left, right }: { left?: ReactNode; right?: ReactNode }) =>
    createElement('header', {}, left, right),
}));
vi.mock('@/features/RightPanel', () => ({
  default: ({ children }: { children?: ReactNode }) => createElement('aside', {}, children),
}));
vi.mock('@/store/channel', () => ({
  channelSelectors: { detail: () => () => undefined },
  useChannelStore: (selector: (state: unknown) => unknown) => selector({}),
}));
vi.mock('./ChannelConversation', () => ({ ChannelConversation: () => null }));
vi.mock('./DraftThreadConversation', () => ({ DraftThreadConversation: () => null }));
vi.mock('./MemberAvatar', () => ({ MemberAvatar: () => null }));
vi.mock('./useThreadMenu', () => ({
  useThreadMenu: () => () => [
    { key: 'archiveThread' },
    { type: 'divider' },
    { key: 'copyThreadLink' },
  ],
}));

const detail = {
  channel: { canDelete: true, id: 'chn_1', status: 'active' },
  members: [],
  messages: [{ content: 'Leaving members', id: 'msg_1' }],
  threads: [{ followerMemberIds: [], id: 'thr_1', rootMessageId: 'msg_1', status: 'active' }],
} as unknown as ChannelDetail;

const renderPanel = (onOpenPage = vi.fn()) =>
  render(
    <ThreadPanel
      detail={detail}
      draft={null}
      threadId="thr_1"
      onClose={vi.fn()}
      onOpenPage={onOpenPage}
      onSendDraft={vi.fn()}
    />,
  );

afterEach(cleanup);

describe('ThreadPanel header', () => {
  it('opens the thread as a page from its own header button, not the "more" menu', () => {
    const onOpenPage = vi.fn();
    renderPanel(onOpenPage);

    expect(screen.getAllByRole('menuitem').map((entry) => entry.textContent)).toEqual([
      'archiveThread',
      'divider',
      'copyThreadLink',
    ]);

    const openPage = screen.getByRole('button', { name: 'openThreadPage' });
    expect(screen.getByTestId('more-menu').contains(openPage)).toBe(false);
    fireEvent.click(openPage);
    expect(onOpenPage).toHaveBeenCalledWith('thr_1');
  });
});
