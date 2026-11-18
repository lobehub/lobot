import { GOAL_ACCEPTANCE_TASK_TITLE } from '@lobechat/const/goal';
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type * as ReplicaModule from '@/libs/replica';
import { useClientDataSWR } from '@/libs/swr';
import { goalService } from '@/services/goal';

import { useGoalStore } from './index';
import { initialState } from './initialState';

vi.mock('@/libs/swr', () => ({
  mutate: vi.fn(),
  useClientDataSWR: vi.fn(),
}));

vi.mock('@/libs/swr/useCacheScope', () => ({
  getCacheScope: () => 'user-1:personal',
  isScopeTrusted: () => true,
  useCacheScope: () => 'user-1:personal',
}));

vi.mock('@/libs/replica', async (importOriginal) => {
  const actual = await importOriginal<typeof ReplicaModule>();
  return { ...actual, revalidateReplica: vi.fn(actual.revalidateReplica) };
});

vi.mock('@/services/goal', () => ({
  goalService: {
    advance: vi.fn(),
    archive: vi.fn(),
    close: vi.fn(),
    decide: vi.fn(),
    delete: vi.fn(),
    getGraph: vi.fn(),
    list: vi.fn(),
    tick: vi.fn(),
    updateTitle: vi.fn(),
  },
}));

vi.mock('@/store/chat', () => ({
  useChatStore: { getState: () => ({ refreshTopicDetail: vi.fn() }) },
}));

vi.mock('@/services/aiChat', () => ({
  aiChatService: { generateJSON: vi.fn() },
}));

const SCOPE = 'user-1:personal';

/** The replica sync call of one resource — the hydrate read shares the hook. */
const syncCallFor = (name: string) =>
  vi
    .mocked(useClientDataSWR)
    .mock.calls.findLast(
      ([key]) => Array.isArray(key) && key[0] === 'replica:sync' && key[1] === name,
    );

/** The sync key of one resource: `['replica:sync', name, version, scope, entryKey, params]`. */
const syncKeyFor = (name: string) => syncCallFor(name)?.[0] as unknown[] | undefined;

const syncConfigFor = (name: string) =>
  syncCallFor(name)?.[2] as { refreshInterval?: number } | undefined;

/** The fetch thunk the driver handed to SWR for that sync. */
const syncFetcherFor = (name: string) => syncCallFor(name)?.[1] as (() => unknown) | undefined;

const graphWith = (status: string, extra: Record<string, unknown> = {}) =>
  ({
    goal: { id: 'goal-1', status, title: 'Goal' },
    nodes: [],
    ...extra,
  }) as never;

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useClientDataSWR).mockReturnValue({
    data: undefined,
    error: undefined,
    isValidating: false,
    mutate: vi.fn(),
  } as never);
  useGoalStore.setState(initialState);
});

describe('GoalAction', () => {
  describe('useFetchGoalGraph', () => {
    const renderGraph = (goalId = 'goal-1') =>
      renderHook(() => useGoalStore.getState().useFetchGoalGraph(goalId));

    const seedGraph = (graph: unknown) =>
      act(() =>
        useGoalStore.setState({ goalGraphById: graph ? { 'goal-1': graph as never } : {} }),
      );

    it.each(['planning', 'running', 'verifying'])(
      'keeps re-reading a %s goal the server is still advancing',
      (status) => {
        // The goal advances from server events now; without this the page would
        // sit on its first snapshot until the tab lost and regained focus.
        seedGraph(graphWith(status));
        renderGraph();

        expect(syncConfigFor('goalGraph')?.refreshInterval).toBeGreaterThan(0);
      },
    );

    /**
     * Regression: the agent starts its draft from the conversation a few seconds
     * after creating it. Unpolled, the card and page kept reading "Not started"
     * while its tasks ran.
     */
    it('keeps re-reading a draft its agent may start at any moment', () => {
      seedGraph(graphWith('draft'));
      renderGraph();

      expect(syncConfigFor('goalGraph')?.refreshInterval).toBeGreaterThan(0);
    });

    it.each(['review', 'paused', 'achieved', 'failed', 'canceled'])(
      'stops polling a %s goal',
      (status) => {
        // Nothing on the server will move these — the next change comes from a
        // person, and the action that makes it refreshes the snapshot itself.
        seedGraph(graphWith(status));
        renderGraph();

        expect(syncConfigFor('goalGraph')?.refreshInterval).toBe(0);
      },
    );

    it('keeps polling a finished goal while its wrap-up report is being written', () => {
      seedGraph(graphWith('achieved', { report: { status: 'running' } }));
      renderGraph();
      expect(syncConfigFor('goalGraph')?.refreshInterval).toBeGreaterThan(0);

      vi.mocked(useClientDataSWR).mockClear();
      seedGraph(graphWith('achieved', { report: { status: 'completed' } }));
      renderGraph();
      expect(syncConfigFor('goalGraph')?.refreshInterval).toBe(0);
    });

    it('does not poll before the first snapshot arrives', () => {
      renderGraph();

      expect(syncConfigFor('goalGraph')?.refreshInterval).toBe(0);
    });

    /**
     * Regression: a rework ends by putting the Goal back on `achieved`, but its
     * own acceptance verdict is a later write. The poll stopped on that
     * half-written snapshot, so an open result page stayed on the rework's
     * starting state — sign-off strip still reading 修改中, criteria count
     * frozen — until the page was reloaded.
     */
    it('keeps polling a terminal Goal whose own acceptance has not settled', () => {
      const withAcceptance = (status: string, title = GOAL_ACCEPTANCE_TASK_TITLE) =>
        graphWith('achieved', {
          acceptances: { 'node-a': { id: 'acc-1', status } },
          nodes: [{ id: 'node-a', kind: 'task', status: 'active', taskId: 't-1', title }],
        });

      for (const status of ['repairing', 'verifying']) {
        vi.mocked(useClientDataSWR).mockClear();
        seedGraph(withAcceptance(status));
        renderGraph();
        expect(syncConfigFor('goalGraph')?.refreshInterval).toBeGreaterThan(0);
      }

      // Settled: the page can rest on this snapshot.
      for (const status of ['delivered', 'accepted', 'rejected']) {
        vi.mocked(useClientDataSWR).mockClear();
        seedGraph(withAcceptance(status));
        renderGraph();
        expect(syncConfigFor('goalGraph')?.refreshInterval).toBe(0);
      }

      // A rejection that reopens the Goal keeps polling: the Goal is running again.
      vi.mocked(useClientDataSWR).mockClear();
      seedGraph({
        ...(withAcceptance('rejected') as Record<string, unknown>),
        goal: { id: 'goal-1', status: 'running', title: 'Goal' },
      });
      renderGraph();
      expect(syncConfigFor('goalGraph')?.refreshInterval).toBeGreaterThan(0);

      // Another task's rejection never keeps a terminal Goal polling.
      vi.mocked(useClientDataSWR).mockClear();
      seedGraph(withAcceptance('rejected', 'Ordinary work'));
      renderGraph();
      expect(syncConfigFor('goalGraph')?.refreshInterval).toBe(0);
    });
  });

  describe('useFetchTopicGoals', () => {
    it('reads the goals created from the topic through the topic-keyed replica', () => {
      renderHook(() => useGoalStore.getState().useFetchTopicGoals('tpc-1'));
      const key = syncKeyFor('topicGoalList');

      expect(key?.[3]).toBe(SCOPE);
      expect(key?.[4]).toBe('tpc-1');
      void syncFetcherFor('topicGoalList')?.();
      expect(goalService.list).toHaveBeenCalledWith({ limit: 20, topicId: 'tpc-1' });
    });

    it('does not fetch without a topic', () => {
      renderHook(() => useGoalStore.getState().useFetchTopicGoals(undefined));

      expect(syncCallFor('topicGoalList')).toBeUndefined();
    });

    it('polls only while one of the goals is still advancing on the server', () => {
      const withStatuses = (...statuses: string[]) => {
        act(() =>
          useGoalStore.setState({
            topicGoalsByTopicId: {
              'tpc-1': {
                goals: statuses.map((status) => ({ goal: { status } })) as never,
                total: statuses.length,
              },
            },
          }),
        );
        renderHook(() => useGoalStore.getState().useFetchTopicGoals('tpc-1'));
        return syncConfigFor('topicGoalList')?.refreshInterval;
      };

      expect(withStatuses('achieved', 'running')).toBeGreaterThan(0);
      expect(withStatuses('review', 'paused')).toBe(0);
      // Regression: the tray read "Not started" after its agent started the draft.
      expect(withStatuses('draft')).toBeGreaterThan(0);
      act(() => useGoalStore.setState({ topicGoalsByTopicId: {} }));
      renderHook(() => useGoalStore.getState().useFetchTopicGoals('tpc-1'));
      expect(syncConfigFor('topicGoalList')?.refreshInterval).toBe(0);
    });

    it('polls while the conversation is generating, before any goal exists', () => {
      // A CLI agent's /goal run creates the goal mid-run: the first read finds
      // nothing, and without polling the tray stayed empty until a page reload.
      renderHook(() => useGoalStore.getState().useFetchTopicGoals('tpc-1', true));

      expect(syncConfigFor('topicGoalList')?.refreshInterval).toBeGreaterThan(0);
    });
  });
});
