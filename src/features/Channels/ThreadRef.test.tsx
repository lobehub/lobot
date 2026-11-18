/**
 * @vitest-environment happy-dom
 */
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { resolveThreadRef, ThreadRef } from './ThreadRef';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const views = vi.hoisted(() => ({ current: {} as Record<string, unknown> }));
vi.mock('@/store/channel', () => ({
  channelSelectors: {
    detail:
      ({ channelId, threadId }: { channelId: string; threadId?: string | null }) =>
      (state: Record<string, unknown>) =>
        state[`${channelId}:${threadId ?? 'main'}`],
  },
  useChannelStore: (selector: (state: unknown) => unknown) => selector(views.current),
}));

const root = { content: 'Fix the login flow\nmore detail', id: 'msg_root' };
const thread = (extra: Record<string, unknown> = {}) => ({
  followerMemberIds: [],
  id: 'cht_1',
  rootMessageId: 'msg_root',
  status: 'active',
  ...extra,
});
const mainView = (threads: unknown[], messages: unknown[] = [root]) => ({ messages, threads });

afterEach(() => {
  views.current = {};
});

describe('resolveThreadRef', () => {
  it('names a thread by the title an Agent gave it, else its root’s first line', () => {
    expect(
      resolveThreadRef('cht_1', { main: mainView([thread({ title: 'Login bug' })]) as any }),
    ).toEqual({ state: 'found', status: 'active', title: 'Login bug' });
    expect(resolveThreadRef('cht_1', { main: mainView([thread()]) as any }).title).toBe(
      'Fix the login flow',
    );
  });

  it('falls back to the thread’s own view when the main timeline is not loaded', () => {
    const own = { messages: [], rootMessage: root, threads: [thread()] };
    expect(resolveThreadRef('cht_1', { own: own as any })).toEqual({
      state: 'found',
      status: 'active',
      title: 'Fix the login flow',
    });
  });

  it('is missing when the loaded Channel no longer lists it, unknown when nothing is loaded', () => {
    expect(resolveThreadRef('cht_gone', { main: mainView([thread()]) as any })).toEqual({
      state: 'missing',
    });
    expect(resolveThreadRef('cht_1', {})).toEqual({ state: 'unknown' });
  });
});

describe('ThreadRef', () => {
  it('shows the thread’s title and opens it on click', () => {
    views.current = { 'chn_1:main': mainView([thread({ title: 'Login bug' })]) };
    const onOpenThread = vi.fn();
    render(<ThreadRef channelId="chn_1" threadId="cht_1" onOpenThread={onOpenThread} />);

    fireEvent.click(screen.getByRole('button', { name: 'Login bug' }));
    expect(onOpenThread).toHaveBeenCalledWith('cht_1');
  });

  it('shows a generic label for a thread not loaded yet, still opening it', () => {
    const onOpenThread = vi.fn();
    render(<ThreadRef channelId="chn_1" threadId="cht_1" onOpenThread={onOpenThread} />);

    fireEvent.click(screen.getByRole('button', { name: 'threadRef.unknown' }));
    expect(onOpenThread).toHaveBeenCalledWith('cht_1');
  });

  it('keeps a removed thread as muted text that opens nothing', () => {
    views.current = { 'chn_1:main': mainView([]) };
    const onOpenThread = vi.fn();
    render(<ThreadRef channelId="chn_1" threadId="cht_1" onOpenThread={onOpenThread} />);

    expect(screen.queryByRole('button')).toBeNull();
    fireEvent.click(screen.getByText('threadRef.unavailable'));
    expect(onOpenThread).not.toHaveBeenCalled();
  });

  it('is plain text where the view cannot open threads', () => {
    views.current = { 'chn_1:main': mainView([thread({ title: 'Login bug' })]) };
    render(<ThreadRef channelId="chn_1" threadId="cht_1" />);

    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.getByText('Login bug')).toBeTruthy();
  });
});
