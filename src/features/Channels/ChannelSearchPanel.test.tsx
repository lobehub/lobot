/**
 * @vitest-environment happy-dom
 */
import { act, render, screen } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { FALLBACK_DELAY } from '@/components/Skeleton/Delayed';
import type { ChannelSearchHit, ChannelSearchPage } from '@/services/channel';

import { ChannelSearchPanel } from './ChannelSearch';

const mocks = vi.hoisted(() => ({ searchMessages: vi.fn() }));

vi.mock('@/services/channel', () => ({
  channelService: { searchMessages: mocks.searchMessages },
}));

vi.mock('./MemberPanel', () => ({
  ChannelSidePanel: ({ children }: { children: ReactNode }) => createElement('div', {}, children),
}));

vi.mock('./AuthorAvatar', () => ({ AuthorAvatar: () => null }));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ i18n: { language: 'en-US' }, t: (key: string) => key }),
}));

const hit = (sequence: number): ChannelSearchHit => ({
  author: { avatar: null, id: 'u1', name: 'Arvin', type: 'user' },
  createdAt: new Date('2026-11-20T08:00:00Z'),
  id: `msg-${sequence}`,
  sequence,
  snippet: `子区 ${sequence}`,
});

const renderPanel = () =>
  render(
    createElement(ChannelSearchPanel, {
      channelId: 'chn_1',
      id: 'search',
      onClose: vi.fn(),
      onOpen: vi.fn(),
      query: '子区',
    }),
  );

const busy = () => document.querySelector('[aria-busy]');

beforeEach(() => {
  vi.useFakeTimers();
  mocks.searchMessages.mockReset();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('ChannelSearchPanel loading', () => {
  it('shows hit-shaped placeholder rows, not a lone spinner, once the search is slow', async () => {
    mocks.searchMessages.mockReturnValue(new Promise<ChannelSearchPage>(() => {}));
    const { container } = renderPanel();

    // A fast search goes straight to results: nothing flashes in the first 200ms.
    expect(busy()).toBeNull();
    expect(container.querySelector('button')).toBeNull();

    await act(async () => {
      vi.advanceTimersByTime(FALLBACK_DELAY);
    });
    const placeholder = busy();
    expect(placeholder).not.toBeNull();
    expect(placeholder!.children).toHaveLength(4);
  });

  it('adds a single placeholder row while the next page loads', async () => {
    mocks.searchMessages
      .mockResolvedValueOnce({ hasMore: true, messages: [hit(9), hit(8)] })
      .mockReturnValueOnce(new Promise<ChannelSearchPage>(() => {}));
    const observers: IntersectionObserverCallback[] = [];
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        constructor(callback: IntersectionObserverCallback) {
          observers.push(callback);
        }
        disconnect() {}
        observe() {}
      },
    );
    renderPanel();
    await act(async () => {});
    expect(screen.getAllByRole('button')).toHaveLength(2);

    await act(async () => {
      observers.at(-1)!([{ isIntersecting: true } as IntersectionObserverEntry], {} as never);
    });
    await act(async () => {
      vi.advanceTimersByTime(FALLBACK_DELAY);
    });
    expect(screen.getAllByRole('button')).toHaveLength(2);
    expect(busy()!.children).toHaveLength(1);
    vi.unstubAllGlobals();
  });
});
