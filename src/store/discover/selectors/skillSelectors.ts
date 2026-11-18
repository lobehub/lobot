import type { DiscoverSkillItem, SkillCategoryItem, SkillListResponse } from '@/types/discover';

import type { DiscoverStore } from '../store';

const EMPTY_CATEGORIES: SkillCategoryItem[] = [];
const EMPTY_RELATED: DiscoverSkillItem[] = [];

/**
 * Readers of the skill market replicas. Every helper takes the `queryKey` the
 * matching fetch hook returned, so a surface that asks for one query never
 * reads another's rows.
 */
const skillList =
  (queryKey?: string) =>
  (s: DiscoverStore): SkillListResponse | undefined =>
    queryKey ? s.skillListMap[queryKey] : undefined;

export const skillSelectors = {
  skillList,
};
