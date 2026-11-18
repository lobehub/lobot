import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createReplicaState } from '@/libs/replica';
import { globalHelpers } from '@/store/global/helpers';

import { useDiscoverStore as useStore } from '../../store';
import {
  groupAgentCategoriesQueryKey,
  groupAgentDetailQueryKey,
  groupAgentIdentifiersQueryKey,
  groupAgentListQueryKey,
} from './projection';

vi.mock('@/services/discover', () => ({
  discoverService: {
    getGroupAgentCategories: vi.fn(),
    getGroupAgentDetail: vi.fn(),
    getGroupAgentIdentifiers: vi.fn(),
    getGroupAgentList: vi.fn(),
  },
}));

// The replica schedules its fetches through the app's SWR driver; the engine
// itself is what these tests exercise, so the driver is a bare recorder.
vi.mock('@/libs/swr', () => ({
  mutate: vi.fn(),
  useClientDataSWR: vi.fn(() => ({ isValidating: false, mutate: vi.fn() })),
}));

const emptyGroupAgentState = () => ({
  groupAgentCategoriesMap: {},
  groupAgentCategoriesReplica: createReplicaState(),
  groupAgentDetailMap: {},
  groupAgentDetailReplica: createReplicaState(),
  groupAgentIdentifiersMap: {},
  groupAgentIdentifiersReplica: createReplicaState(),
  groupAgentListMap: {},
  groupAgentListReplica: createReplicaState(),
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(globalHelpers, 'getCurrentLanguage').mockReturnValue('en-US');
  useStore.setState(emptyGroupAgentState());
});

describe('GroupAgentSlice (replica)', () => {
  describe('replica key helpers', () => {
    it('produces stable, distinct keys per query dimension', () => {
      expect(groupAgentListQueryKey({ locale: 'en-US', page: 1, pageSize: 20 })).toBe(
        groupAgentListQueryKey({ locale: 'en-US', page: 1, pageSize: 20 }),
      );
      expect(groupAgentDetailQueryKey({ identifier: 'a' })).not.toBe(
        groupAgentDetailQueryKey({ identifier: 'b' }),
      );
      expect(groupAgentCategoriesQueryKey({ q: 'a' })).not.toBe(groupAgentCategoriesQueryKey({}));
      expect(groupAgentIdentifiersQueryKey()).toBe(groupAgentIdentifiersQueryKey({}));
    });
  });
});
