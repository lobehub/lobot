import type { CategoryItem } from '@lobehub/market-sdk';

import type { AssistantListResponse } from '@/types/discover';

import type { DiscoverStore } from '../store';

const EMPTY_CATEGORIES: CategoryItem[] = [];

/**
 * Readers of the assistant market replicas. Every helper takes the `queryKey`
 * the matching fetch hook returned, so a surface that asks for one query never
 * reads another's rows.
 */
const assistantList =
  (queryKey?: string) =>
  (s: DiscoverStore): AssistantListResponse | undefined =>
    queryKey ? s.assistantListMap[queryKey] : undefined;

export const assistantSelectors = {
  assistantList,
};
