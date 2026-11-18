import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { useElectronStore } from '@/store/electron';

import {
  useActiveLocation,
  useActiveLocationReader,
  useActiveLocationSelector,
} from './useActiveLocation.desktop';

const tab = (id: string, url: string) => ({ id, lastVisited: 0, url });

afterEach(() => {
  useElectronStore.setState({ activeTabId: null, tabs: [] });
});

describe('useActiveLocation (desktop)', () => {
  it('derives pathname/search from the active tab url and drops any hash', () => {
    useElectronStore.setState({
      activeTabId: 't1',
      tabs: [tab('t1', '/agent/a?topic=x#frag'), tab('t2', '/settings')],
    });

    const { result } = renderHook(() => useActiveLocation());

    expect(result.current.pathname).toBe('/agent/a');
    expect(result.current.search).toBe('?topic=x');
    expect(result.current.hash).toBe('');
  });

  it('updates when the active tab switches', () => {
    useElectronStore.setState({
      activeTabId: 't1',
      tabs: [tab('t1', '/agent/a'), tab('t2', '/settings/general')],
    });

    const { result } = renderHook(() => useActiveLocation());
    expect(result.current.pathname).toBe('/agent/a');

    act(() => useElectronStore.setState({ activeTabId: 't2' }));

    expect(result.current.pathname).toBe('/settings/general');
  });

  it('falls back to "/" when there is no active tab', () => {
    useElectronStore.setState({ activeTabId: null, tabs: [] });

    const { result } = renderHook(() => useActiveLocation());

    expect(result.current.pathname).toBe('/');
    expect(result.current.search).toBe('');
  });
});

describe('useActiveLocationSelector (desktop)', () => {
  it('re-renders only when the selected value changes', () => {
    useElectronStore.setState({ activeTabId: 't1', tabs: [tab('t1', '/channels/a')] });
    let renders = 0;
    const { result } = renderHook(() => {
      renders += 1;
      return useActiveLocationSelector(({ pathname }) => pathname.startsWith('/channels'));
    });
    expect(result.current).toBe(true);
    const before = renders;

    act(() => useElectronStore.setState({ tabs: [tab('t1', '/channels/b')] }));
    expect(renders).toBe(before);

    act(() => useElectronStore.setState({ tabs: [tab('t1', '/settings')] }));
    expect(result.current).toBe(false);
  });
});

describe('useActiveLocationReader (desktop)', () => {
  it('reads the current location without re-rendering on navigation', () => {
    useElectronStore.setState({ activeTabId: 't1', tabs: [tab('t1', '/channels/a')] });
    let renders = 0;
    const { result } = renderHook(() => {
      renders += 1;
      return useActiveLocationReader();
    });
    const before = renders;

    act(() => useElectronStore.setState({ tabs: [tab('t1', '/channels/b?thread=t')] }));

    expect(renders).toBe(before);
    expect(result.current().pathname).toBe('/channels/b');
    expect(result.current().search).toBe('?thread=t');
  });
});
