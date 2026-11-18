import { act, render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import SWRMutateInitializer from './SWRMutateInitializer.desktop';

const handlers = new Map<string, () => void>();
const mutateMock = vi.hoisted(() => vi.fn(() => Promise.resolve()));

vi.mock('@lobechat/electron-client-ipc', () => ({
  useWatchBroadcast: (event: string, handler: () => void) => {
    handlers.set(event, handler);
  },
}));

vi.mock('swr', () => ({
  useSWRConfig: () => ({ mutate: mutateMock }),
}));

vi.mock('@/libs/swr', () => ({ setScopedMutate: vi.fn() }));
vi.mock('@/spa/initialize/desktopIdentity', () => ({ applyDesktopBootstrapIdentity: vi.fn() }));

describe('SWRMutateInitializer (desktop)', () => {
  beforeEach(() => {
    handlers.clear();
    mutateMock.mockClear();
  });

  it('refetches every key, keeping its data, once the token is refreshed', () => {
    render(<SWRMutateInitializer />);

    act(() => handlers.get('tokenRefreshed')?.());

    expect(mutateMock).toHaveBeenCalledTimes(1);
    // A matcher alone revalidates; a data argument would wipe what is on screen.
    expect(mutateMock.mock.calls[0]).toHaveLength(1);
    const [matcher] = mutateMock.mock.calls[0] as unknown as [(key: unknown) => boolean];
    expect(matcher('any-key')).toBe(true);
  });
});
