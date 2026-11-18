import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useDiscoverStore as useStore } from '../../store';
import { initialUserSliceState } from './initialState';
import { userProfileQueryKey } from './projection';

vi.mock('@/services/discover', () => ({
  discoverService: {
    getUserInfo: vi.fn(),
  },
}));

// The replica schedules its fetches through the app's SWR driver; the engine
// itself is what these tests exercise, so the driver is a bare recorder.
vi.mock('@/libs/swr', () => ({
  mutate: vi.fn(),
  useClientDataSWR: vi.fn(() => ({ isValidating: false, mutate: vi.fn() })),
}));

beforeEach(() => {
  vi.clearAllMocks();
  useStore.setState({ ...initialUserSliceState });
});

describe('UserSlice (replica)', () => {
  describe('replica key helpers', () => {
    it('produces stable, distinct keys per username and locale', () => {
      expect(userProfileQueryKey({ locale: 'en-US', username: 'a' })).toBe(
        userProfileQueryKey({ locale: 'en-US', username: 'a' }),
      );
      expect(userProfileQueryKey({ locale: 'en-US', username: 'a' })).not.toBe(
        userProfileQueryKey({ locale: 'en-US', username: 'b' }),
      );
      expect(userProfileQueryKey({ locale: 'en-US', username: 'a' })).not.toBe(
        userProfileQueryKey({ locale: 'zh-CN', username: 'a' }),
      );
    });
  });
});
