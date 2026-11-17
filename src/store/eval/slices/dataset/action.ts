import type { AgentEvalDataset, AgentEvalDatasetListItem } from '@lobot/types';
import isEqual from 'fast-deep-equal';

import {
  arrayEntity,
  createReplicaSlice,
  linkReplicaEntity,
  recordLens,
  type ReplicaSyncResult,
  singleEntity,
} from '@/libs/replica';
import { agentEvalService } from '@/services/agentEval';
import { type EvalStore, useEvalStore } from '@/store/eval/store';
import { type StoreSetter } from '@/store/types';
import { isTrpcErrorCode } from '@/utils/trpcError';

import {
  ALL_DATASETS_KEY,
  datasetDetailResource,
  datasetListResource,
  toDatasetDetail,
} from './projection';

type Setter = StoreSetter<EvalStore>;

/** The scope-wide list takes no params; the literal keeps `useSync` active. */
const ALL_DATASETS_PARAMS = {} as Record<string, never>;

/** Pre-migration `useFetchAllDatasets` return shape, backed by the scope-wide entry. */
interface DatasetListSyncResult extends ReplicaSyncResult {
  /** The list once it has settled (hydrated or fetched), else `undefined`. */
  data: AgentEvalDatasetListItem[] | undefined;
  /** First load in flight with nothing settled yet. */
  isLoading: boolean;
  /** Alias of `revalidate`, kept for the pre-migration call sites. */
  mutate: () => Promise<unknown>;
}

/** Pre-migration `useFetchDatasetDetail` return shape, backed by the detail replica. */
interface DatasetDetailSyncResult {
  /** The dataset once it has settled (hydrated or fetched), else `undefined`. */
  data: AgentEvalDataset | undefined;
  error: unknown;
  /** First load in flight with nothing settled yet. */
  isLoading: boolean;
  /** Alias of `revalidate`, kept for the pre-migration call sites. */
  mutate: () => Promise<unknown>;
}

export const createDatasetSlice = (set: Setter, get: () => EvalStore, _api?: unknown) =>
  new DatasetActionImpl(set, get, _api);

class DatasetActionImpl {
  readonly #detail;
  readonly #list;

  constructor(set: Setter, get: () => EvalStore, _api?: unknown) {
    void _api;

    // Two local-first resources over the dataset entity, each owning ONE store
    // location (the selectors keep reading those maps):
    // - `#list`: benchmark-scoped lists + the scope-wide list → `datasetListMap`
    // - `#detail`: by-id dataset page → `datasetDetailMap`
    this.#list = createReplicaSlice(datasetListResource, {
      actionPrefix: 'datasetList',
      entity: arrayEntity<AgentEvalDatasetListItem>((dataset) => dataset.id),
      fetcher: ({ benchmarkId }) =>
        benchmarkId
          ? agentEvalService.listDatasets(benchmarkId)
          : agentEvalService.listAllDatasets(),
      get,
      set,
      stateKey: 'datasetListReplica',
      view: recordLens<EvalStore, AgentEvalDatasetListItem[]>('datasetListMap'),
    });
    this.#detail = createReplicaSlice(datasetDetailResource, {
      actionPrefix: 'datasetDetail',
      entity: singleEntity<AgentEvalDataset>((dataset) => dataset.id),
      fetcher: async (id) => toDatasetDetail(await agentEvalService.getDataset(id)),
      get,
      // Every response is a fresh object: an unchanged revalidation (focus,
      // reconnect, manual refresh) must not repaint the detail view.
      merge: (incoming, confirmed) => (isEqual(incoming, confirmed) ? undefined : incoming),
      set,
      stateKey: 'datasetDetailReplica',
      view: recordLens<EvalStore, AgentEvalDataset>('datasetDetailMap'),
    });
    linkReplicaEntity<AgentEvalDataset>([this.#list, this.#detail]);
  }
}

export type DatasetAction = Pick<DatasetActionImpl, keyof DatasetActionImpl>;
