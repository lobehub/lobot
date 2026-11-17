import type { CategoryItem, CategoryListQuery } from '@lobehub/market-sdk';

import { createReplicaSlice, recordLens, type ReplicaSyncResult } from '@/libs/replica';
import type { DiscoverStore } from '@/store/discover';
import { globalHelpers } from '@/store/global/helpers';
import type { StoreSetter } from '@/store/types';
import type { DiscoverMcpDetail, McpListResponse, McpQueryParams } from '@/types/discover';
import { setNamespace } from '@/utils/storeDebug';

import {
  type McpCategoriesParams,
  mcpCategoriesQueryKey,
  mcpCategoriesResource,
  type McpDetailParams,
  mcpDetailQueryKey,
  mcpDetailResource,
  type McpListParams,
  mcpListQueryKey,
  mcpListResource,
} from './projection';

const n = setNamespace('discover/mcp');

/**
 * Sync flags of a market read, plus the aliases the old SWR hooks returned
 * (`isLoading` / `mutate`) so a call site only has to move its `data` read to
 * the matching `mcpSelectors` entry.
 */
interface MCPSyncResult extends ReplicaSyncResult {
  /** A request is in flight and this entry has no value to show yet. */
  isLoading: boolean;
  /** Alias of `revalidate`. */
  mutate: () => Promise<unknown>;
  /** Read the value with `mcpSelectors.*(queryKey)`; undefined while disabled. */
  queryKey?: string;
}

type Setter = StoreSetter<DiscoverStore>;

export const createMCPSlice = (set: Setter, get: () => DiscoverStore, _api?: unknown) =>
  new MCPActionImpl(set, get, _api);

class MCPActionImpl {
  constructor(set: Setter, get: () => DiscoverStore, _api?: unknown) {
    void _api;
    createReplicaSlice(mcpListResource, {
      actionPrefix: n('list'),
      get,
      set,
      stateKey: 'mcpListReplica',
      view: recordLens<DiscoverStore, McpListResponse>('mcpListMap'),
    });
    createReplicaSlice(mcpDetailResource, {
      actionPrefix: n('detail'),
      get,
      // The market no longer has this server: drop the entry and its persisted
      // row rather than keep serving the cached copy.
      isMissing: (detail) => detail === null,
      set,
      stateKey: 'mcpDetailReplica',
      view: recordLens<DiscoverStore, DiscoverMcpDetail>('mcpDetailMap'),
    });
    createReplicaSlice(mcpCategoriesResource, {
      actionPrefix: n('categories'),
      get,
      set,
      stateKey: 'mcpCategoriesReplica',
      view: recordLens<DiscoverStore, CategoryItem[]>('mcpCategoriesMap'),
    });
  }
}

export type MCPAction = Pick<MCPActionImpl, keyof MCPActionImpl>;
