import type { MarketUserProfile } from '@/layout/AuthProvider/MarketAuth/types';

import type { DiscoverStore } from '../store';

const userProfile =
  (queryKey?: string) =>
  (s: DiscoverStore): MarketUserProfile | undefined =>
    queryKey ? s.marketUserProfileMap[queryKey] : undefined;

export const marketSelectors = {
  userProfile,
};
