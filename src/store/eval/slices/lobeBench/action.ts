import type { AgentEvalDatasetListItem, AgentEvalRunListItem } from '@lobot/types';

import { createReplicaSlice, recordLens } from '@/libs/replica';
import { agentEvalService } from '@/services/agentEval';
import { type ReplicaQueryResult, toReplicaQueryResult } from '@/store/eval/replicaQuery';
import { type EvalStore, useEvalStore } from '@/store/eval/store';
import { type StoreSetter } from '@/store/types';
import { setNamespace } from '@/utils/storeDebug';

import {
  fetchCasesByDataset,
  fetchDatasetCases,
  fetchLobeBenchDatasets,
  fetchLobeBenchRuns,
  fetchRunResultsByRun,
} from './fetchers';
import {
  type CasesByDataset,
  casesByDatasetResource,
  datasetCaseListResource,
  ENVIRONMENT_LIST_KEY,
  ENVIRONMENT_LIST_PARAMS,
  environmentListResource,
  type EvalEnvironmentRow,
  experimentRunListResource,
  idSetKey,
  type LobeBenchCase,
  lobeBenchDatasetListResource,
  lobeBenchRunListResource,
  type RunResultsByRun,
  runResultsByRunResource,
} from './projection';

const n = setNamespace('evalLobeBench');

type Setter = StoreSetter<EvalStore>;

/** Only the scheduling knob callers pass today; `useSync` accepts the full schedule. */
type PollConfig = { refreshInterval?: number };

export const createLobeBenchSlice = (set: Setter, get: () => EvalStore, _api?: unknown) =>
  new LobeBenchActionImpl(set, get, _api);

/**
 * The Lobe Bench pages' server data. Each list is a replica owning one map of
 * the store; the hooks keep the `{ data, error, isLoading, mutate }` shape.
 */
class LobeBenchActionImpl {
  constructor(set: Setter, get: () => EvalStore, _api?: unknown) {
    void _api;

    createReplicaSlice(lobeBenchDatasetListResource, {
      actionPrefix: n('datasets'),
      fetcher: ({ benchmarkIds }) => fetchLobeBenchDatasets(benchmarkIds),
      get,
      set,
      stateKey: 'lobeBenchDatasetListReplica',
      view: recordLens<EvalStore, AgentEvalDatasetListItem[]>('lobeBenchDatasetListMap'),
    });
    createReplicaSlice(lobeBenchRunListResource, {
      actionPrefix: n('runs'),
      fetcher: ({ benchmarkIds }) => fetchLobeBenchRuns(benchmarkIds),
      get,
      set,
      stateKey: 'lobeBenchRunListReplica',
      view: recordLens<EvalStore, AgentEvalRunListItem[]>('lobeBenchRunListMap'),
    });
    createReplicaSlice(experimentRunListResource, {
      actionPrefix: n('experimentRuns'),
      fetcher: (experimentId) => agentEvalService.listAllRuns({ experimentId }),
      get,
      set,
      stateKey: 'experimentRunListReplica',
      view: recordLens<EvalStore, AgentEvalRunListItem[]>('experimentRunListMap'),
    });
    createReplicaSlice(runResultsByRunResource, {
      actionPrefix: n('runResults'),
      fetcher: fetchRunResultsByRun,
      get,
      set,
      stateKey: 'runResultsByRunReplica',
      view: recordLens<EvalStore, RunResultsByRun>('runResultsByRunMap'),
    });
    createReplicaSlice(datasetCaseListResource, {
      actionPrefix: n('datasetCases'),
      fetcher: fetchDatasetCases,
      get,
      set,
      stateKey: 'datasetCaseListReplica',
      view: recordLens<EvalStore, LobeBenchCase[]>('datasetCaseListMap'),
    });
    createReplicaSlice(casesByDatasetResource, {
      actionPrefix: n('casesByDataset'),
      fetcher: fetchCasesByDataset,
      get,
      set,
      stateKey: 'casesByDatasetReplica',
      view: recordLens<EvalStore, CasesByDataset>('casesByDatasetMap'),
    });
    createReplicaSlice(environmentListResource, {
      actionPrefix: n('environments'),
      fetcher: async () => (await agentEvalService.listEnvironments()) as EvalEnvironmentRow[],
      get,
      set,
      stateKey: 'environmentListReplica',
      view: recordLens<EvalStore, EvalEnvironmentRow[]>('environmentListMap'),
    });
  }
}

export type LobeBenchAction = Pick<LobeBenchActionImpl, keyof LobeBenchActionImpl>;
