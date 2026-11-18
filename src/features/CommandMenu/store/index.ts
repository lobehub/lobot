import { shallow } from 'zustand/shallow';
import { createWithEqualityFn } from 'zustand/traditional';

import {
  createReplicaSlice,
  createReplicaState,
  recordLens,
  type ReplicaState,
  type ReplicaSyncResult,
  stableQueryKey,
} from '@/libs/replica';
import { lambdaClient } from '@/libs/trpc/client';
import type { FtsSearchResult } from '@/types/serverData';

import { type CommandMenuSearchParams, commandMenuSearchResource } from './projection';

export type { CommandMenuSearchParams } from './projection';

interface CommandMenuSearchState {
  searchResultMap: Record<string, FtsSearchResult[]>;
  searchResultReplica: ReplicaState<FtsSearchResult[]>;
}

export const useCommandMenuSearchStore = createWithEqualityFn<CommandMenuSearchState>()(
  () => ({ searchResultMap: {}, searchResultReplica: createReplicaState() }),
  shallow,
);

const searchSlice = createReplicaSlice(commandMenuSearchResource, {
  actionPrefix: 'commandMenuSearch',
  fetcher: ({ agentId, locale, query, type }) =>
    lambdaClient.search.query.query({
      agentId,
      // Keep the aggregate response DB-only: marketplace results are reached
      // through the permanent typed-search entries instead of gating every
      // keystroke on three remote marketplace round-trips.
      includeMarketplace: false,
      limitPerType: type ? 50 : 5, // Show more results when filtering by type
      locale,
      query,
      type,
    }),
  get: useCommandMenuSearchStore.getState,
  set: useCommandMenuSearchStore.setState,
  stateKey: 'searchResultReplica',
  view: recordLens<CommandMenuSearchState, FtsSearchResult[]>('searchResultMap'),
});

export const commandMenuSearchSelectors = {
  /** `undefined` until this query answers. */
  results: (params: CommandMenuSearchParams | null) => (s: CommandMenuSearchState) =>
    params ? s.searchResultMap[stableQueryKey(params)] : undefined,
};

export const useFetchCommandMenuSearch = (
  params: CommandMenuSearchParams | null,
): ReplicaSyncResult =>
  searchSlice.useSync(params, { revalidateOnFocus: false, revalidateOnReconnect: false });
