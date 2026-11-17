import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useContactEvents } from './useContactEvents';

type Handler = (event?: any) => void;

const { feed, handlers, markUnavailable, mux, refreshAll } = vi.hoisted(() => {
  const handlers = new Map<string, Handler>();
  return {
    feed: { url: 'https://gateway.test' as string | undefined },
    handlers,
    markUnavailable: vi.fn(),
    mux: {
      connect: vi.fn(),
      on: vi.fn((name: string, handler: Handler) => {
        handlers.set(name, handler);
        return () => handlers.delete(name);
      }),
    },
    refreshAll: vi.fn(),
  };
});

vi.mock('@/hooks/useGatewayUserFeed', () => ({ useGatewayUserFeed: () => feed.url }));
vi.mock('@/store/contact', () => ({ contactActions: { refreshAll } }));
vi.mock('@/store/chat/slices/agentRun/actions/transports/gateway/muxRegistry', () => ({
  getGatewayMux: () => mux,
  markGatewayMuxUnavailable: markUnavailable,
}));

describe('useContactEvents', () => {
  beforeEach(() => {
    feed.url = 'https://gateway.test';
    handlers.clear();
    vi.clearAllMocks();
  });

  it('re-reads contacts when the gateway says they changed', () => {
    renderHook(() => useContactEvents());
    expect(mux.connect).toHaveBeenCalled();

    handlers.get('user_changed')?.({ topic: 'contacts', type: 'user_changed' });
    expect(refreshAll).toHaveBeenCalledTimes(1);
  });

  it('ignores other topics', () => {
    renderHook(() => useContactEvents());
    handlers.get('user_changed')?.({ topic: 'something_else', type: 'user_changed' });
    expect(refreshAll).not.toHaveBeenCalled();
  });

  it('re-reads after every reconnect, since notices are not replayed', () => {
    renderHook(() => useContactEvents());
    handlers.get('connected')?.();
    expect(refreshAll).toHaveBeenCalledTimes(1);
  });

  it('marks the socket unavailable so polling takes over', () => {
    renderHook(() => useContactEvents());
    handlers.get('unavailable')?.();
    expect(markUnavailable).toHaveBeenCalledWith({ gatewayUrl: 'https://gateway.test' });
  });

  it('does not connect without a gateway feed, and unsubscribes on unmount', () => {
    feed.url = undefined;
    renderHook(() => useContactEvents());
    expect(mux.connect).not.toHaveBeenCalled();

    feed.url = 'https://gateway.test';
    const { unmount } = renderHook(() => useContactEvents());
    expect(handlers.size).toBe(3);
    unmount();
    expect(handlers.size).toBe(0);
  });
});
