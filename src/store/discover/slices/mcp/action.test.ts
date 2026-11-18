import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createReplicaState } from '@/libs/replica';
import { globalHelpers } from '@/store/global/helpers';

import { useDiscoverStore as useStore } from '../../store';
import { mcpCategoriesQueryKey, mcpDetailQueryKey, mcpListQueryKey } from './projection';

vi.mock('@/services/discover', () => ({
  discoverService: {
    getMcpCategories: vi.fn(),
    getMcpDetail: vi.fn(),
    getMcpList: vi.fn(),
  },
}));

// The replica schedules its fetches through the app's SWR driver; the engine
// itself is what these tests exercise, so the driver is a bare recorder.
vi.mock('@/libs/swr', () => ({
  mutate: vi.fn(),
  useClientDataSWR: vi.fn(() => ({ isValidating: false, mutate: vi.fn() })),
}));

const emptyMcpState = () => ({
  mcpCategoriesMap: {},
  mcpCategoriesReplica: createReplicaState(),
  mcpDetailMap: {},
  mcpDetailReplica: createReplicaState(),
  mcpListMap: {},
  mcpListReplica: createReplicaState(),
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(globalHelpers, 'getCurrentLanguage').mockReturnValue('en-US');
  useStore.setState(emptyMcpState());
});

describe('MCPSlice (replica)', () => {
  describe('replica key helpers', () => {
    it('produces stable, distinct keys per query dimension', () => {
      expect(mcpListQueryKey({ locale: 'en-US', page: 1, pageSize: 21 })).toBe(
        mcpListQueryKey({ locale: 'en-US', page: 1, pageSize: 21 }),
      );
      expect(mcpDetailQueryKey({ identifier: 'a' })).not.toBe(
        mcpDetailQueryKey({ identifier: 'b' }),
      );
      expect(mcpDetailQueryKey({ identifier: 'a' })).not.toBe(
        mcpDetailQueryKey({ identifier: 'a', version: '2.0.0' }),
      );
      expect(mcpCategoriesQueryKey({ q: 'a' })).not.toBe(mcpCategoriesQueryKey({}));
    });
  });
});
