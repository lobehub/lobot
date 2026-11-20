import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { WORKSPACE_RAIL_HINT_KEY, writeWorkspaceRailHint } from './railHint';
import { useRailColumnShown } from './useRailColumnShown';

const store = vi.hoisted(() => ({
  available: false,
  listInit: false,
  loading: true,
  ready: true,
  show: true,
}));

vi.mock('@/business/client/workspace/store', () => ({
  useWorkspaceStore: (
    selector: (s: {
      isWorkspaceAvailable: boolean;
      isWorkspaceListInit: boolean;
      isWorkspaceLoading: boolean;
    }) => unknown,
  ) =>
    selector({
      isWorkspaceAvailable: store.available,
      isWorkspaceListInit: store.listInit,
      isWorkspaceLoading: store.loading,
    }),
}));

vi.mock('@/store/user', () => ({
  useUserStore: (selector: (s: unknown) => unknown) =>
    selector({
      defaultSettings: { general: {} },
      isUserStateInit: store.ready,
      settings: { general: { showWorkspaceRail: store.show } },
    }),
}));

beforeEach(() => {
  store.available = false;
  store.listInit = false;
  store.loading = true;
  store.ready = true;
  store.show = true;
});

afterEach(() => localStorage.removeItem(WORKSPACE_RAIL_HINT_KEY));

describe('useRailColumnShown', () => {
  it('takes the column once workspaces are available', () => {
    store.available = true;
    store.loading = false;
    expect(renderHook(() => useRailColumnShown()).result.current).toBe(true);
  });

  it('takes the column from the saved list before the server answers', () => {
    store.listInit = true;
    expect(renderHook(() => useRailColumnShown()).result.current).toBe(true);
  });

  it('holds the column while loading only if the rail showed last time', () => {
    expect(renderHook(() => useRailColumnShown()).result.current).toBe(false);

    writeWorkspaceRailHint(true);
    expect(renderHook(() => useRailColumnShown()).result.current).toBe(true);
  });

  it('gives the column up where the server has no workspaces', () => {
    writeWorkspaceRailHint(true);
    store.loading = false;
    expect(renderHook(() => useRailColumnShown()).result.current).toBe(false);
  });

  it('stays hidden when the appearance setting is off', () => {
    store.available = true;
    store.loading = false;
    store.show = false;
    expect(renderHook(() => useRailColumnShown()).result.current).toBe(false);
  });

  it('keeps the last column while settings are still loading', () => {
    store.ready = false;
    store.show = false;
    writeWorkspaceRailHint(true);
    expect(renderHook(() => useRailColumnShown()).result.current).toBe(true);
  });

  it('keeps the column when user state resets after the setting was read', () => {
    store.available = true;
    store.loading = false;
    const hook = renderHook(() => useRailColumnShown());
    expect(hook.result.current).toBe(true);

    store.ready = false;
    hook.rerender();
    expect(hook.result.current).toBe(true);
  });
});
