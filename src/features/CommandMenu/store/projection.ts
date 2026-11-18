import { defineReplica, stableQueryKey } from '@/libs/replica';
import type { FtsSearchResult } from '@/types/serverData';

import type { ValidSearchType } from '../utils/queryParser';

/** Everything that changes what one command-menu search returns. */
export interface CommandMenuSearchParams {
  agentId?: string;
  locale: string;
  query: string;
  type?: ValidSearchType;
}

/**
 * Command-menu search results, one entry per query. Memory only: results are
 * per keystroke and only matter while the menu is open.
 */
export const commandMenuSearchResource = defineReplica<CommandMenuSearchParams, FtsSearchResult[]>({
  key: (params) => stableQueryKey(params),
  name: 'commandMenuSearch',
  storage: 'memory',
  version: 1,
});
