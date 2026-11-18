import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createReplicaState } from '@/libs/replica';
import { globalHelpers } from '@/store/global/helpers';
import type { SkillListResponse } from '@/types/discover';

import { skillSelectors } from '../../selectors';
import { useDiscoverStore as useStore } from '../../store';
import {
  skillCategoriesQueryKey,
  skillCommentsQueryKey,
  skillDetailQueryKey,
  skillListQueryKey,
  skillRatingDistributionQueryKey,
  skillRelatedQueryKey,
} from './projection';

vi.mock('@/services/discover', () => ({
  discoverService: {
    getSkillCategories: vi.fn(),
    getSkillComments: vi.fn(),
    getSkillDetail: vi.fn(),
    getSkillList: vi.fn(),
    getSkillRatingDistribution: vi.fn(),
  },
}));

// The replica schedules its fetches through the app's SWR driver; the engine
// itself is what these tests exercise, so the driver is a bare recorder.
vi.mock('@/libs/swr', () => ({
  mutate: vi.fn(),
  useClientDataSWR: vi.fn(() => ({ isValidating: false, mutate: vi.fn() })),
}));

const listItem = (identifier: string) => ({ identifier, name: identifier }) as any;

const makeList = (identifier = 'skill-1'): SkillListResponse =>
  ({
    currentPage: 1,
    items: [listItem(identifier)],
    pageSize: 21,
    totalCount: 1,
    totalPages: 1,
  }) as any;

const emptySkillState = () => ({
  skillCategoriesMap: {},
  skillCategoriesReplica: createReplicaState(),
  skillCommentsMap: {},
  skillCommentsReplica: createReplicaState(),
  skillDetailMap: {},
  skillDetailReplica: createReplicaState(),
  skillListMap: {},
  skillListReplica: createReplicaState(),
  skillRatingDistributionMap: {},
  skillRatingDistributionReplica: createReplicaState(),
  skillRelatedMap: {},
  skillRelatedReplica: createReplicaState(),
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(globalHelpers, 'getCurrentLanguage').mockReturnValue('en-US');
  useStore.setState(emptySkillState());
});

/** The replica network syncs registered with the SWR driver, per resource name. */
const syncCalls = async (
  name:
    | 'skillCategories'
    | 'skillComments'
    | 'skillDetail'
    | 'skillList'
    | 'skillRatingDistribution'
    | 'skillRelated',
) => {
  const { useClientDataSWR } = await import('@/libs/swr');
  return vi
    .mocked(useClientDataSWR)
    .mock.calls.filter(
      ([key]) => Array.isArray(key) && key[0] === 'replica:sync' && key[1] === name,
    )
    .map(([key, fetcher, config]) => ({
      config: config as {
        onError?: (error: unknown) => void;
        onSuccess?: (data: unknown) => void;
      },
      fetcher: fetcher as () => Promise<any>,
      key: key as unknown[],
    }));
};

describe('SkillSlice (replica)', () => {
  describe('useFetchSkillList', () => {
    it('requests the list with normalized page / pageSize and the locale', async () => {
      const { discoverService } = await import('@/services/discover');

      renderHook(() => useStore.getState().useFetchSkillList({ q: 'gpt' }));

      const [call] = await syncCalls('skillList');
      await call.fetcher();

      expect(discoverService.getSkillList).toHaveBeenCalledWith({
        locale: 'en-US',
        page: 1,
        pageSize: 21,
        q: 'gpt',
      });
    });

    it('keys each page and filter set as its own replica entry', () => {
      const { result } = renderHook(() => [
        useStore.getState().useFetchSkillList({ page: 1 }),
        useStore.getState().useFetchSkillList({ page: 2 }),
        useStore.getState().useFetchSkillList({ category: 'git-github' }),
      ]);

      const [first, second, third] = result.current;
      expect(new Set([first.queryKey, second.queryKey, third.queryKey]).size).toBe(3);
    });

    it('does not register a sync — and reports no loading — when disabled', async () => {
      const { result } = renderHook(() =>
        useStore.getState().useFetchSkillList({ page: 1 }, { enabled: false }),
      );

      expect(result.current.queryKey).toBeUndefined();
      expect(result.current.isLoading).toBe(false);
      expect(await syncCalls('skillList')).toHaveLength(0);
    });

    it('reports loading until the entry has a value to show', () => {
      const { result } = renderHook(() => useStore.getState().useFetchSkillList({ page: 1 }));

      expect(result.current.isLoading).toBe(true);
    });

    it('does not report loading when the entry already has a (hydrated) value', () => {
      const key = skillListQueryKey({ locale: 'en-US', page: 1, pageSize: 21 });
      useStore.setState({ skillListMap: { [key]: makeList() } });

      const { result } = renderHook(() => useStore.getState().useFetchSkillList({ page: 1 }));

      expect(result.current.queryKey).toBe(key);
      expect(result.current.isLoading).toBe(false);
    });

    it('folds the response into the replica view the selectors read', async () => {
      const response = makeList();

      renderHook(() => useStore.getState().useFetchSkillList({ page: 1 }));
      const [call] = await syncCalls('skillList');
      act(() => call.config.onSuccess!(response));

      const key = skillListQueryKey({ locale: 'en-US', page: 1, pageSize: 21 });
      expect(skillSelectors.skillList(key)(useStore.getState())).toEqual(response);
    });
  });

  describe('replica key helpers', () => {
    it('produces stable, distinct keys per query dimension', () => {
      expect(skillListQueryKey({ locale: 'en-US', page: 1, pageSize: 21 })).toBe(
        skillListQueryKey({ locale: 'en-US', page: 1, pageSize: 21 }),
      );
      expect(skillDetailQueryKey({ identifier: 'a' })).not.toBe(
        skillDetailQueryKey({ identifier: 'b' }),
      );
      expect(skillCategoriesQueryKey({ q: 'a' })).not.toBe(skillCategoriesQueryKey({}));
      expect(skillCommentsQueryKey({ identifier: 'a', page: 1 })).not.toBe(
        skillCommentsQueryKey({ identifier: 'a', page: 2 }),
      );
      expect(skillRatingDistributionQueryKey({ identifier: 'a' })).not.toBe(
        skillRatingDistributionQueryKey({ identifier: 'b' }),
      );
      expect(skillRelatedQueryKey({ category: 'a', identifier: 'b' })).not.toBe(
        skillRelatedQueryKey({ category: 'a', identifier: 'c' }),
      );
    });
  });
});
