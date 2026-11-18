import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { cacheScope, createReplicaState } from '@/libs/replica';
import { taskLabelService } from '@/services/taskLabel';

import { taskLabelSelectors } from '../../selectors';
import { useTaskStore } from '../../store';

vi.mock('@/services/taskLabel', () => ({
  taskLabelService: {
    addToTask: vi.fn(),
    changeForTask: vi.fn(),
    create: vi.fn(),
    list: vi.fn(),
    removeFromTask: vi.fn(),
  },
}));

// The replica schedules its fetches through the app's SWR driver; the engine
// itself is what these tests exercise, so the driver is a bare recorder.
vi.mock('@/libs/swr', () => ({
  mutate: vi.fn(),
  useClientDataSWR: vi.fn(() => ({ isValidating: false, mutate: vi.fn() })),
}));

vi.mock('@lobehub/ui', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  ...(await import('~base-ui-stubs')).baseUiStubs,
}));

const label = (id: string, name: string) =>
  ({ color: null, id, isGroup: false, name, parentId: null, usageCount: 0 }) as any;

let scope = 'user-1:ws-a';

const syncCalls = async () => {
  const { useClientDataSWR } = await import('@/libs/swr');
  return vi
    .mocked(useClientDataSWR)
    .mock.calls.filter(
      ([key]) => Array.isArray(key) && key[0] === 'replica:sync' && key[1] === 'taskLabels',
    )
    .map(([, fetcher, config]) => ({
      config: config as { onSuccess?: (data: unknown) => void },
      fetcher: fetcher as () => Promise<any>,
    }));
};

const loadRegistry = async (labels: unknown[]) => {
  vi.mocked(taskLabelService.list).mockResolvedValue(labels as any);
  renderHook(() => useTaskStore.getState().useFetchTaskLabels(true));
  const [call] = await syncCalls();
  const fetched = await call.fetcher();
  act(() => call.config.onSuccess!(fetched));
};

beforeEach(() => {
  vi.clearAllMocks();
  scope = 'user-1:ws-a';
  vi.spyOn(cacheScope, 'get').mockImplementation(() => scope);
  vi.spyOn(cacheScope, 'use').mockImplementation(() => scope);
  vi.spyOn(cacheScope, 'canPersist').mockReturnValue(false);
  useTaskStore.setState({
    taskLabels: [],
    taskLabelsInit: false,
    taskLabelsReplica: createReplicaState(),
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('TaskLabelSliceAction', () => {
  describe('useFetchTaskLabels', () => {
    it('folds the registry into the store the selectors read', async () => {
      await loadRegistry([label('a', 'From A')]);

      const state = useTaskStore.getState();
      expect(taskLabelSelectors.isLabelsInit(state)).toBe(true);
      expect(taskLabelSelectors.labels(state)).toEqual([
        expect.objectContaining({ name: 'From A' }),
      ]);
    });

    it('does not sync while disabled', async () => {
      renderHook(() => useTaskStore.getState().useFetchTaskLabels(false));

      const { useClientDataSWR } = await import('@/libs/swr');
      const keys = vi.mocked(useClientDataSWR).mock.calls.map(([key]) => key);
      expect(keys.some((key) => Array.isArray(key) && key[1] === 'taskLabels')).toBe(false);
    });
  });

  describe('createTaskLabel', () => {
    it('adds the new label to the loaded registry right away', async () => {
      await loadRegistry([label('a', 'From A')]);
      vi.mocked(taskLabelService.create).mockResolvedValue(label('b', 'New'));

      await useTaskStore.getState().createTaskLabel({ name: 'New' });

      expect(taskLabelSelectors.labels(useTaskStore.getState()).map((l) => l.id)).toEqual([
        'a',
        'b',
      ]);
    });

    it('does not add a label created in a workspace the user has since left', async () => {
      await loadRegistry([]);
      vi.mocked(taskLabelService.create).mockImplementation(async () => {
        scope = 'user-1:ws-b';
        return label('a', 'From A');
      });

      await useTaskStore.getState().createTaskLabel({ name: 'From A' });

      expect(useTaskStore.getState().taskLabels).toEqual([]);
    });
  });
});
