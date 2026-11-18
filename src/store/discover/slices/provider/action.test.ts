import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createReplicaState } from '@/libs/replica';
import { globalHelpers } from '@/store/global/helpers';

import { useDiscoverStore as useStore } from '../../store';
import {
  providerDetailQueryKey,
  providerIdentifiersQueryKey,
  providerListQueryKey,
} from './projection';

vi.mock('@/services/discover', () => ({
  discoverService: {
    getProviderDetail: vi.fn(),
    getProviderIdentifiers: vi.fn(),
    getProviderList: vi.fn(),
  },
}));

// The replica schedules its fetches through the app's SWR driver; the engine
// itself is what these tests exercise, so the driver is a bare recorder.
vi.mock('@/libs/swr', () => ({
  mutate: vi.fn(),
  useClientDataSWR: vi.fn(() => ({ isValidating: false, mutate: vi.fn() })),
}));

const emptyProviderState = () => ({
  providerDetailMap: {},
  providerDetailReplica: createReplicaState(),
  providerIdentifiersMap: {},
  providerIdentifiersReplica: createReplicaState(),
  providerListMap: {},
  providerListReplica: createReplicaState(),
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(globalHelpers, 'getCurrentLanguage').mockReturnValue('en-US');
  useStore.setState(emptyProviderState());
});

describe('ProviderSlice (replica)', () => {
  describe('replica key helpers', () => {
    it('produces stable, distinct keys per query dimension', () => {
      expect(providerListQueryKey({ locale: 'en-US', page: 1, pageSize: 21 })).toBe(
        providerListQueryKey({ locale: 'en-US', page: 1, pageSize: 21 }),
      );
      expect(providerDetailQueryKey({ identifier: 'a' })).not.toBe(
        providerDetailQueryKey({ identifier: 'b' }),
      );
      expect(providerIdentifiersQueryKey()).toBe(providerIdentifiersQueryKey({}));
    });
  });
});
