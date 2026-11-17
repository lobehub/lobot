import { type AgentEvalExperimentDetail, type AgentEvalExperimentListItem } from '@lobot/types';

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

import {
  EXPERIMENT_LIST_KEY,
  experimentDetailResource,
  experimentListResource,
} from './projection';

type Setter = StoreSetter<EvalStore>;

/** The list has no params; the literal keeps `useSync` active with one entry. */
const LIST_PARAMS = {} as Record<string, never>;

/**
 * The experiment list keeps its long-standing flat field (`experimentList`) as
 * the replica view, gated by `experimentListInit` so a loaded-but-empty list
 * stays distinguishable from one that was never fetched (the sidebar's
 * skeleton gate).
 */
const experimentListLens: ReplicaLens<EvalStore, AgentEvalExperimentListItem[]> = {
  clear: () => ({ experimentList: [], experimentListInit: false }),
  get: (state) => (state.experimentListInit ? state.experimentList : undefined),
  keys: (state) => (state.experimentListInit ? [EXPERIMENT_LIST_KEY] : []),
  set: (_state, _key, data) =>
    data
      ? { experimentList: data, experimentListInit: true }
      : { experimentList: [], experimentListInit: false },
};

/** Pre-migration `useFetchExperiments` return shape, backed by the list replica. */
interface ExperimentListSyncResult extends ReplicaSyncResult {
  /** The list once it has settled (hydrated or fetched), else `undefined`. */
  data: AgentEvalExperimentListItem[] | undefined;
  /** First load in flight with nothing settled yet. */
  isLoading: boolean;
  /** Alias of `revalidate`, kept for the pre-migration call sites. */
  mutate: () => Promise<unknown>;
}

/** Pre-migration `useFetchExperimentDetail` return shape, backed by the detail replica. */
interface ExperimentDetailSyncResult {
  error: unknown;
  /** First load in flight with nothing settled yet. */
  isLoading: boolean;
  /** Alias of `revalidate`, kept for the pre-migration call sites. */
  mutate: () => Promise<unknown>;
}

export const createExperimentSlice = (set: Setter, get: () => EvalStore, _api?: unknown) =>
  new ExperimentActionImpl(set, get, _api);

class ExperimentActionImpl {
  readonly #detail;
  readonly #list;

  constructor(set: Setter, get: () => EvalStore, _api?: unknown) {
    void _api;

    this.#list = createReplicaSlice(experimentListResource, {
      actionPrefix: 'experimentList',
      entity: arrayEntity<AgentEvalExperimentListItem>((experiment) => experiment.id),
      fetcher: () => agentEvalService.listExperiments(),
      get,
      merge: (response) => response.data,
      set,
      stateKey: 'experimentListReplica',
      view: experimentListLens,
    });
    this.#detail = createReplicaSlice(experimentDetailResource, {
      actionPrefix: 'experimentDetail',
      // The detail is a superset of the list row: the same experiment is
      // patched here and in the list when a mutation fans out through
      // `#entity`.
      entity: singleEntity<AgentEvalExperimentDetail, AgentEvalExperimentListItem>(
        (experiment) => experiment.id,
      ),
      fetcher: (id) => agentEvalService.getExperiment(id),
      get,
      merge: (response) => response.data,
      set,
      stateKey: 'experimentDetailReplica',
      view: recordLens<EvalStore, AgentEvalExperimentDetail>('experimentDetailMap'),
    });
    // The same experiment lives in the list and in its workspace page: an edit
    // or a delete patches both copies at once.
    linkReplicaEntity<AgentEvalExperimentListItem>([this.#list, this.#detail]);
  }
}

export type ExperimentAction = Pick<ExperimentActionImpl, keyof ExperimentActionImpl>;
