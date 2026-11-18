/**
 * @vitest-environment happy-dom
 *
 * The goal domain is a set of replicas now: the lists, the graph snapshot and
 * the metric series paint from their persisted copy on the first frame, the
 * network only confirms, deleting a goal fans out across every list that holds
 * it, and a scope switch never shows the previous identity's rows.
 */
import { randomUUID } from 'node:crypto';

import type { GoalGraphSnapshot } from '@lobot/types';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import { createElement, useEffect } from 'react';
import { SWRConfig, useSWRConfig } from 'swr';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { cacheScope } from '@/libs/replica';
import { setScopedMutate } from '@/libs/swr/mutate';
import { goalService } from '@/services/goal';
import { metricService } from '@/services/metric';

import { useGoalStore } from './index';
import { initialState } from './initialState';
import {
  goalGraphResource,
  goalListResource,
  goalMetricSeriesResource,
  homeGoalListResource,
} from './projection';

vi.mock('@/services/goal', () => ({
  goalService: {
    delete: vi.fn(),
    getGraph: vi.fn(),
    list: vi.fn(),
  },
}));

vi.mock('@/services/metric', () => ({
  metricService: { listSeriesWithPoints: vi.fn() },
}));

const MutateBridge = () => {
  const { mutate } = useSWRConfig();
  useEffect(() => setScopedMutate(mutate), [mutate]);
  return null;
};

const wrapper = ({ children }: PropsWithChildren) =>
  createElement(
    SWRConfig,
    { value: { dedupingInterval: 0, provider: () => new Map() } },
    createElement(MutateBridge),
    children,
  );

const graph = (id: string, status = 'running'): GoalGraphSnapshot =>
  ({ goal: { id, status, title: id }, nodes: [] }) as unknown as GoalGraphSnapshot;

/** Never-resolving fetch: the first frame can only come from storage. */
const pending = () => new Promise<never>(() => {});

const AGENT_KEY = 'agent-1';
const ALL_STORAGE_KEY = goalListResource.storageKey({ agentId: AGENT_KEY, filter: 'all' });
const REVIEW_STORAGE_KEY = goalListResource.storageKey({ agentId: AGENT_KEY, filter: 'review' });
const GRAPH_STORAGE_KEY = goalGraphResource.storageKey('goal-1');
const SERIES_STORAGE_KEY = goalMetricSeriesResource.storageKey('goal-1');
const GRAPH_G1_STORAGE_KEY = goalGraphResource.storageKey('g1');
const SERIES_G1_STORAGE_KEY = goalMetricSeriesResource.storageKey('g1');
const HOME_SCOPE = 'home-scope';
const HOME_STORAGE_KEY = homeGoalListResource.storageKey({ scope: HOME_SCOPE });

const ALL_QUERY_KEYS = [
  ALL_STORAGE_KEY,
  REVIEW_STORAGE_KEY,
  GRAPH_STORAGE_KEY,
  SERIES_STORAGE_KEY,
  GRAPH_G1_STORAGE_KEY,
  SERIES_G1_STORAGE_KEY,
  HOME_STORAGE_KEY,
];

describe('goal store replicas', () => {
  const scopes = new Set<string>();
  const scopeRef = { current: '' };
  const useScope = (next: string) => {
    scopeRef.current = next;
    scopes.add(next);
  };

  beforeEach(() => {
    useScope(`goal-user-${randomUUID()}:personal`);
    vi.spyOn(cacheScope, 'get').mockImplementation(() => scopeRef.current);
    vi.spyOn(cacheScope, 'use').mockImplementation(() => scopeRef.current);
    vi.spyOn(cacheScope, 'canPersist').mockReturnValue(true);
    act(() => useGoalStore.setState(initialState));
  });

  afterEach(async () => {
    for (const value of scopes) {
      for (const queryKey of ALL_QUERY_KEYS) {
        for (const resource of [
          goalListResource,
          goalGraphResource,
          goalMetricSeriesResource,
          homeGoalListResource,
        ]) {
          await resource.storage!.remove({ queryKey, scope: value });
        }
      }
    }
    scopes.clear();
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  it('paints the persisted graph snapshot before the network answers', async () => {
    await goalGraphResource.storage!.set(
      { queryKey: GRAPH_STORAGE_KEY, scope: scopeRef.current },
      { data: graph('goal-1'), updatedAt: 1 },
    );
    vi.mocked(goalService.getGraph).mockImplementation(pending);

    const sync = renderHook(() => useGoalStore((s) => s.useFetchGoalGraph)('goal-1'), { wrapper });
    const snapshot = renderHook(() => useGoalStore((s) => s.goalGraphById['goal-1']));

    await waitFor(() => expect(snapshot.result.current?.goal.id).toBe('goal-1'));
    expect(sync.result.current.isHydrated).toBe(true);
  });

  it('evicts a goal deleted elsewhere: a NOT_FOUND graph read drops the snapshot and its series', async () => {
    let rejectGraph: (error: unknown) => void = () => {};
    vi.mocked(goalService.getGraph).mockReturnValue(
      new Promise((_resolve, reject) => {
        rejectGraph = reject;
      }) as never,
    );
    vi.mocked(metricService.listSeriesWithPoints).mockImplementation(pending);

    await goalGraphResource.storage!.set(
      { queryKey: GRAPH_G1_STORAGE_KEY, scope: scopeRef.current },
      { data: graph('g1'), updatedAt: 1 },
    );
    await goalMetricSeriesResource.storage!.set(
      { queryKey: SERIES_G1_STORAGE_KEY, scope: scopeRef.current },
      { data: [{ key: 'stars', points: [{ value: 1 }] }] as never, updatedAt: 1 },
    );

    renderHook(() => useGoalStore((s) => s.useFetchGoalGraph)('g1'), { wrapper });
    const view = renderHook(() => useGoalStore((s) => s.goalGraphById.g1));

    // The first frame is the persisted snapshot of the now-deleted goal...
    await waitFor(() => expect(view.result.current?.goal.id).toBe('g1'));

    // ...and the deleted-elsewhere answer is definitive, so it is evicted.
    await act(async () => {
      rejectGraph({ data: { code: 'NOT_FOUND' } });
    });

    await waitFor(() => expect(useGoalStore.getState().goalGraphById.g1).toBeUndefined());
    await waitFor(() => expect(useGoalStore.getState().goalMetricSeriesById.g1).toBeUndefined());
    await waitFor(async () =>
      expect(
        await goalGraphResource.storage!.get({
          queryKey: GRAPH_G1_STORAGE_KEY,
          scope: scopeRef.current,
        }),
      ).toBeUndefined(),
    );
  });

  it('keeps the persisted snapshot when the graph read fails transiently', async () => {
    let rejectGraph: (error: unknown) => void = () => {};
    vi.mocked(goalService.getGraph).mockReturnValue(
      new Promise((_resolve, reject) => {
        rejectGraph = reject;
      }) as never,
    );
    vi.mocked(metricService.listSeriesWithPoints).mockImplementation(pending);

    await goalGraphResource.storage!.set(
      { queryKey: GRAPH_G1_STORAGE_KEY, scope: scopeRef.current },
      { data: graph('g1'), updatedAt: 1 },
    );

    renderHook(() => useGoalStore((s) => s.useFetchGoalGraph)('g1'), { wrapper });
    const view = renderHook(() => useGoalStore((s) => s.goalGraphById.g1));
    await waitFor(() => expect(view.result.current?.goal.id).toBe('g1'));

    await act(async () => {
      rejectGraph(new Error('network down'));
    });
    // A transient failure is not a delete: the persisted snapshot stays.
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(useGoalStore.getState().goalGraphById.g1).toBeDefined();
  });
});
