import { shallow } from 'zustand/shallow';
import { createWithEqualityFn } from 'zustand/traditional';

import type { ContextCredSummary } from '@/helpers/claudeCodeTokenCred';
import {
  createReplicaSlice,
  createReplicaState,
  recordLens,
  type ReplicaState,
  type ReplicaSyncResult,
} from '@/libs/replica';
import { lambdaClient } from '@/libs/trpc/client';

import { CREDS_FOR_CONTEXT_KEY, credsForContextResource } from './projection';

interface CredsState {
  credsForContextMap: Record<string, ContextCredSummary[]>;
  credsForContextReplica: ReplicaState<ContextCredSummary[]>;
}

export const useCredsStore = createWithEqualityFn<CredsState>()(
  () => ({ credsForContextMap: {}, credsForContextReplica: createReplicaState() }),
  shallow,
);

const credsForContextSlice = createReplicaSlice(credsForContextResource, {
  actionPrefix: 'creds/listForContext',
  fetcher: async () => {
    const result = await lambdaClient.market.creds.listForContext.query();
    return result.data as ContextCredSummary[];
  },
  get: useCredsStore.getState,
  set: useCredsStore.setState,
  stateKey: 'credsForContextReplica',
  view: recordLens<CredsState, ContextCredSummary[]>('credsForContextMap'),
});

const CONTEXT_PARAMS = {} as Record<string, never>;

export const credsSelectors = {
  /** `undefined` until the list of the active scope is loaded. */
  credsForContext: (s: CredsState) => s.credsForContextMap[CREDS_FOR_CONTEXT_KEY],
};

export const useFetchCredsForContext = (enabled: boolean): ReplicaSyncResult =>
  credsForContextSlice.useSync(CONTEXT_PARAMS, { enabled });
