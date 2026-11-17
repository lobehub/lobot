import isEqual from 'fast-deep-equal';

import {
  arrayEntity,
  createReplicaSlice,
  linkReplicaEntity,
  recordLens,
  type ReplicaLens,
  type ReplicaSyncResult,
  singleEntity,
} from '@/libs/replica';
import { agentEvalService } from '@/services/agentEval';
import { type EvalStore, useEvalStore } from '@/store/eval/store';
import { type StoreSetter } from '@/store/types';
import { isTrpcErrorCode } from '@/utils/trpcError';

import {
  BENCHMARK_LIST_KEY,
  type BenchmarkDetail,
  benchmarkDetailResource,
  type BenchmarkListItem,
  benchmarkListResource,
} from './projection';

type Setter = StoreSetter<EvalStore>;

/** The list has no params; the literal keeps `useSync` active with one entry. */
const LIST_PARAMS = {} as Record<string, never>;

/**
 * The benchmark list keeps its long-standing flat field (`benchmarkList`) as the
 * replica view, gated by `benchmarkListInit` so a loaded-but-empty list stays
 * distinguishable from one that was never fetched (the sidebar's skeleton gate).
 */
const benchmarkListLens: ReplicaLens<EvalStore, BenchmarkListItem[]> = {
  clear: () => ({ benchmarkList: [], benchmarkListInit: false }),
  get: (state) => (state.benchmarkListInit ? state.benchmarkList : undefined),
  keys: (state) => (state.benchmarkListInit ? [BENCHMARK_LIST_KEY] : []),
  set: (_state, _key, data) =>
    data
      ? { benchmarkList: data, benchmarkListInit: true }
      : { benchmarkList: [], benchmarkListInit: false },
};

/** Pre-migration `useFetchBenchmarks` return shape, backed by the list replica. */
interface BenchmarkListSyncResult extends ReplicaSyncResult {
  /** The list once it has settled (hydrated or fetched), else `undefined`. */
  data: BenchmarkListItem[] | undefined;
  /** First load in flight with nothing settled yet. */
  isLoading: boolean;
  /** Alias of `revalidate`, kept for the pre-migration call sites. */
  mutate: () => Promise<unknown>;
}

/** Pre-migration `useFetchBenchmarkDetail` return shape, backed by the detail replica. */
interface BenchmarkDetailSyncResult {
  error: unknown;
  /** First load in flight with nothing settled yet. */
  isLoading: boolean;
  /** Alias of `revalidate`, kept for the pre-migration call sites. */
  mutate: () => Promise<unknown>;
}

export const createBenchmarkSlice = (set: Setter, get: () => EvalStore, _api?: unknown) =>
  new BenchmarkActionImpl(set, get, _api);

class BenchmarkActionImpl {
  readonly #detail;
  readonly #list;

  constructor(set: Setter, get: () => EvalStore, _api?: unknown) {
    void _api;
    this.#list = createReplicaSlice(benchmarkListResource, {
      actionPrefix: 'benchmarkList',
      entity: arrayEntity<BenchmarkListItem>((benchmark) => benchmark.id),
      fetcher: () => agentEvalService.listBenchmarks(),
      get,
      set,
      stateKey: 'benchmarkListReplica',
      view: benchmarkListLens,
    });
    this.#detail = createReplicaSlice(benchmarkDetailResource, {
      actionPrefix: 'benchmarkDetail',
      entity: singleEntity<BenchmarkDetail>((benchmark) => benchmark.id),
      fetcher: (id) => agentEvalService.getBenchmark(id),
      get,
      // An unchanged page must not repaint the detail view.
      merge: (incoming, confirmed) => (isEqual(incoming, confirmed) ? undefined : incoming),
      set,
      stateKey: 'benchmarkDetailReplica',
      view: recordLens<EvalStore, BenchmarkDetail>('benchmarkDetailMap'),
    });
    // The same benchmark lives in the list and in its detail page: an edit or a
    // delete patches both copies at once.
    linkReplicaEntity<BenchmarkListItem>([this.#list, this.#detail]);
  }
}

export type BenchmarkAction = Pick<BenchmarkActionImpl, keyof BenchmarkActionImpl>;
