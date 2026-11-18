import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createReplicaState } from '@/libs/replica';
import { globalHelpers } from '@/store/global/helpers';

import { useDiscoverStore as useStore } from '../../store';
import {
  pluginCategoriesQueryKey,
  pluginDetailQueryKey,
  pluginIdentifiersQueryKey,
  pluginListQueryKey,
} from './projection';

vi.mock('@/services/discover', () => ({
  discoverService: {
    getPluginCategories: vi.fn(),
    getPluginDetail: vi.fn(),
    getPluginIdentifiers: vi.fn(),
    getPluginList: vi.fn(),
  },
}));

// The replica schedules its fetches through the app's SWR driver; the engine
// itself is what these tests exercise, so the driver is a bare recorder.
vi.mock('@/libs/swr', () => ({
  mutate: vi.fn(),
  useClientDataSWR: vi.fn(() => ({ isValidating: false, mutate: vi.fn() })),
}));

const emptyPluginState = () => ({
  pluginCategoriesMap: {},
  pluginCategoriesReplica: createReplicaState(),
  pluginDetailMap: {},
  pluginDetailReplica: createReplicaState(),
  pluginIdentifiersMap: {},
  pluginIdentifiersReplica: createReplicaState(),
  pluginListMap: {},
  pluginListReplica: createReplicaState(),
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(globalHelpers, 'getCurrentLanguage').mockReturnValue('en-US');
  useStore.setState(emptyPluginState());
});

describe('PluginSlice (replica)', () => {
  describe('replica key helpers', () => {
    it('produces stable, distinct keys per query dimension', () => {
      expect(pluginListQueryKey({ locale: 'en-US', page: 1, pageSize: 21 })).toBe(
        pluginListQueryKey({ locale: 'en-US', page: 1, pageSize: 21 }),
      );
      expect(pluginDetailQueryKey({ identifier: 'a', withManifest: false })).not.toBe(
        pluginDetailQueryKey({ identifier: 'b', withManifest: false }),
      );
      expect(pluginDetailQueryKey({ identifier: 'a', withManifest: false })).not.toBe(
        pluginDetailQueryKey({ identifier: 'a', withManifest: true }),
      );
      expect(pluginCategoriesQueryKey({ q: 'a' })).not.toBe(pluginCategoriesQueryKey({}));
      expect(pluginIdentifiersQueryKey()).toBe(pluginIdentifiersQueryKey({}));
    });
  });
});
