/**
 * @vitest-environment happy-dom
 */
import 'fake-indexeddb/auto';

import { randomUUID } from 'node:crypto';

import { renderHook, waitFor } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import { SWRConfig } from 'swr';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { cacheScope, createReplicaState } from '@/libs/replica';
import { useCredsStore } from '@/store/creds';

import { useCredsForContext } from './useScopedCreds';

const { listForContext } = vi.hoisted(() => ({ listForContext: vi.fn() }));

vi.mock('@/libs/trpc/client', () => ({
  lambdaClient: { market: { creds: { listForContext: { query: listForContext } } } },
}));

const wrapper = ({ children }: { children: ReactNode }) =>
  createElement(SWRConfig, { value: { dedupingInterval: 0, provider: () => new Map() } }, children);

describe('useScopedCreds', () => {
  let scope: string;

  const useScope = (next: string) => {
    scope = next;
    vi.spyOn(cacheScope, 'get').mockImplementation(() => scope);
    vi.spyOn(cacheScope, 'use').mockImplementation(() => scope);
  };

  beforeEach(() => {
    useScope(`creds-user:${randomUUID()}`);
    vi.spyOn(cacheScope, 'canPersist').mockReturnValue(false);
    useCredsStore.setState({
      credsForContextMap: {},
      credsForContextReplica: createReplicaState(),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    listForContext.mockReset();
  });

  it('reads the run-scope list', async () => {
    listForContext.mockResolvedValue({ data: [{ key: 'CLAUDE_CODE_OAUTH_TOKEN', name: 'Token' }] });

    const { result } = renderHook(() => useCredsForContext(), { wrapper });

    expect(result.current.isLoading).toBe(true);
    await waitFor(() =>
      expect(result.current.data).toEqual([{ key: 'CLAUDE_CODE_OAUTH_TOKEN', name: 'Token' }]),
    );
    expect(result.current.isLoading).toBe(false);
  });

  it('skips the run-scope fetch when disabled', () => {
    const { result } = renderHook(() => useCredsForContext(false), { wrapper });

    expect(listForContext).not.toHaveBeenCalled();
    expect(result.current.isLoading).toBe(false);
  });

  it('settles a failed lookup instead of loading forever', async () => {
    listForContext.mockRejectedValue(Object.assign(new Error('UNAUTHORIZED'), { status: 401 }));

    const { result } = renderHook(() => useCredsForContext(), { wrapper });

    await waitFor(() => expect(result.current.error).toBeDefined());
    expect(result.current.isLoading).toBe(false);
  });
});
