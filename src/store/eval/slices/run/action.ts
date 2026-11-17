import type {
  AgentEvalRunDetail,
  AgentEvalRunListItem,
  AgentEvalRunResults,
  EvalRunInputConfig,
} from '@lobot/types';

import {
  arrayEntity,
  createReplicaSlice,
  linkReplicaEntity,
  recordLens,
  type ReplicaSyncResult,
  singleEntity,
} from '@/libs/replica';
import { agentEvalService } from '@/services/agentEval';
import type { EvalStore } from '@/store/eval/store';
import { type StoreSetter } from '@/store/types';
import { setNamespace } from '@/utils/storeDebug';

import {
  benchmarkRunListResource,
  datasetRunListResource,
  runDetailResource,
  runResultsResource,
} from './projection';

const n = setNamespace('evalRun');

type Setter = StoreSetter<EvalStore>;

/** Only the scheduling knob callers pass today; `useSync` accepts the full schedule. */
type FetchConfig = { refreshInterval?: number };

export const createRunSlice = (set: Setter, get: () => EvalStore, _api?: unknown) =>
  new RunActionImpl(set, get, _api);

class RunActionImpl {
  /**
   * Four local-first resources over the run entity, each owning ONE store
   * location (selectors keep reading those maps):
   * - `#benchmarkRunList`: sidebar + RunsTab → `runListMap[benchmarkId]`
   * - `#datasetRunList`: dataset page → `datasetRunListMap[datasetId]`
   * - `#runDetail`: by-id detail → `runDetailMap[runId]`
   * - `#runResults`: by-id case results → `runResultsMap[runId]`
   * `#runEntity` fans a run-level change (delete / update) out to whichever
   * list and detail currently hold that run.
   */
  readonly #benchmarkRunList;
  readonly #datasetRunList;
  readonly #runDetail;

  constructor(set: Setter, get: () => EvalStore, _api?: unknown) {
    void _api;

    this.#benchmarkRunList = createReplicaSlice(benchmarkRunListResource, {
      actionPrefix: n('benchmarkRunList'),
      entity: arrayEntity<AgentEvalRunListItem>((run) => run.id),
      fetcher: ({ benchmarkId }) => agentEvalService.listRuns({ benchmarkId }),
      get,
      merge: (response) => response.data,
      set,
      stateKey: 'runListReplica',
      view: recordLens<EvalStore, AgentEvalRunListItem[]>('runListMap'),
    });
    this.#datasetRunList = createReplicaSlice(datasetRunListResource, {
      actionPrefix: n('datasetRunList'),
      entity: arrayEntity<AgentEvalRunListItem>((run) => run.id),
      fetcher: ({ datasetId }) => agentEvalService.listRuns({ datasetId }),
      get,
      merge: (response) => response.data,
      set,
      stateKey: 'datasetRunListReplica',
      view: recordLens<EvalStore, AgentEvalRunListItem[]>('datasetRunListMap'),
    });
    this.#runDetail = createReplicaSlice(runDetailResource, {
      actionPrefix: n('runDetail'),
      // The detail is a superset of the list row: the same run is patched here
      // and in the lists when a mutation fans out through `#runEntity`.
      entity: singleEntity<AgentEvalRunDetail, AgentEvalRunListItem>((run) => run.id),
      fetcher: (runId) => agentEvalService.getRunDetails(runId),
      get,
      set,
      stateKey: 'runDetailReplica',
      view: recordLens<EvalStore, AgentEvalRunDetail>('runDetailMap'),
    });
    createReplicaSlice(runResultsResource, {
      actionPrefix: n('runResults'),
      fetcher: (runId) => agentEvalService.getRunResults(runId),
      get,
      set,
      stateKey: 'runResultsReplica',
      view: recordLens<EvalStore, AgentEvalRunResults>('runResultsMap'),
    });
    linkReplicaEntity<AgentEvalRunListItem>([
      this.#benchmarkRunList,
      this.#datasetRunList,
      this.#runDetail,
    ]);
  }
}

export type RunAction = Pick<RunActionImpl, keyof RunActionImpl>;
