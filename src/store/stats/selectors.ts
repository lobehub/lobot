import type { AgentUsageStats } from '@/types/usage/usageRecord';

import type { StatsState } from './initialState';
import {
  agentUsageKey,
  type AgentUsageParams,
  SINGLE_KEY,
  type StatsCount,
  type StatsCountKind,
  type StatsHeatmap,
  type StatsHeatmapKind,
  type StatsRankKind,
  type StatsRankMap,
  type StatsRegistration,
  type StatsTotal,
  type StatsTotalKind,
  type UsageByDay,
  type UsageLogs,
  usageMonthKey,
} from './projection';

const count =
  (kind: StatsCountKind) =>
  (s: StatsState): StatsCount | undefined =>
    s.countMap[kind];

export const statsSelectors = {
  count,
};
