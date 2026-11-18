import type { StatsState } from './initialState';
import { type StatsCount, type StatsCountKind } from './projection';

const count =
  (kind: StatsCountKind) =>
  (s: StatsState): StatsCount | undefined =>
    s.countMap[kind];

export const statsSelectors = {
  count,
};
