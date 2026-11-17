import type { MarketUserProfile } from '@/layout/AuthProvider/MarketAuth/types';
import type { MarketSkillPackageFile } from '@/services/marketApi';
import type { AgentForkSourceResponse, AgentGroupForkSourceResponse } from '@/types/discover';

import type { MarketAgentGroupStatus, MarketAgentStatus } from '../slices/market/projection';
import type { DiscoverStore } from '../store';

const userProfile =
  (queryKey?: string) =>
  (s: DiscoverStore): MarketUserProfile | undefined =>
    queryKey ? s.marketUserProfileMap[queryKey] : undefined;

export const marketSelectors = {
  userProfile,
};
