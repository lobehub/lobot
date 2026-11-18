import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createReplicaState } from '@/libs/replica';
import { globalHelpers } from '@/store/global/helpers';

import { useDiscoverStore as useStore } from '../../store';
import {
  modelCategoriesQueryKey,
  modelDetailQueryKey,
  modelIdentifiersQueryKey,
  modelListQueryKey,
} from './projection';

vi.mock('@/services/discover', () => ({
  discoverService: {
    getModelCategories: vi.fn(),
    getModelDetail: vi.fn(),
    getModelIdentifiers: vi.fn(),
    getModelList: vi.fn(),
  },
}));

// The replica schedules its fetches through the app's SWR driver; the engine
// itself is what these tests exercise, so the driver is a bare recorder.
vi.mock('@/libs/swr', () => ({
  mutate: vi.fn(),
  useClientDataSWR: vi.fn(() => ({ isValidating: false, mutate: vi.fn() })),
}));

const emptyModelState = () => ({
  modelCategoriesMap: {},
  modelCategoriesReplica: createReplicaState(),
  modelDetailMap: {},
  modelDetailReplica: createReplicaState(),
  modelIdentifiersMap: {},
  modelIdentifiersReplica: createReplicaState(),
  modelListMap: {},
  modelListReplica: createReplicaState(),
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(globalHelpers, 'getCurrentLanguage').mockReturnValue('en-US');
  useStore.setState(emptyModelState());
});

describe('ModelSlice (replica)', () => {
  describe('replica key helpers', () => {
    it('produces stable, distinct keys per query dimension', () => {
      expect(modelListQueryKey({ locale: 'en-US', page: 1, pageSize: 21 })).toBe(
        modelListQueryKey({ locale: 'en-US', page: 1, pageSize: 21 }),
      );
      expect(modelDetailQueryKey({ identifier: 'a' })).not.toBe(
        modelDetailQueryKey({ identifier: 'b' }),
      );
      expect(modelCategoriesQueryKey({ q: 'a' })).not.toBe(modelCategoriesQueryKey({}));
      expect(modelIdentifiersQueryKey()).toBe(modelIdentifiersQueryKey({}));
    });
  });
});
