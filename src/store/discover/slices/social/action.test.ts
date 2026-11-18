import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useDiscoverStore as useStore } from '../../store';
import { initialSocialSliceState } from './initialState';
import { socialListKey, socialUserKey } from './projection';

vi.mock('@/services/social', () => ({
  socialService: {
    addFavorite: vi.fn(),
    checkFollowStatus: vi.fn(),
    follow: vi.fn(),
    getFollowCounts: vi.fn(),
    getFollowers: vi.fn(),
    getFollowing: vi.fn(),
    getUserFavoriteAgents: vi.fn(),
    getUserFavoritePlugins: vi.fn(),
    removeFavorite: vi.fn(),
    toggleLike: vi.fn(),
    unfollow: vi.fn(),
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
  useStore.setState({ ...initialSocialSliceState });
});

describe('SocialSlice (replica)', () => {
  describe('replica key helpers', () => {
    it('produces stable, distinct keys per query dimension', () => {
      expect(socialUserKey({ userId: 1 })).toBe(socialUserKey({ userId: 1 }));
      expect(socialUserKey({ userId: 1 })).not.toBe(socialUserKey({ userId: 2 }));

      expect(socialListKey({ page: 1, userId: 1 })).toBe(socialListKey({ page: 1, userId: 1 }));
      expect(socialListKey({ page: 1, userId: 1 })).not.toBe(socialListKey({ page: 2, userId: 1 }));
      expect(socialListKey({ page: 1, userId: 1 })).not.toBe(socialListKey({ page: 1, userId: 2 }));
    });
  });
});
