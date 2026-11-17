import { createReplicaSlice, recordLens } from '@/libs/replica';
import { agentEvalService } from '@/services/agentEval';
import { type ReplicaQueryResult, toReplicaQueryResult } from '@/store/eval/replicaQuery';
import { type EvalStore, useEvalStore } from '@/store/eval/store';
import { type StoreSetter } from '@/store/types';
import { setNamespace } from '@/utils/storeDebug';

import {
  connectorDetailKey,
  type DatasetConnectorBindings,
  datasetConnectorBindingsResource,
  type EvalConnectorDetail,
  evalConnectorDetailResource,
  type EvalConnectorList,
  evalConnectorListResource,
} from './projection';

const n = setNamespace('evalConnector');

type Setter = StoreSetter<EvalStore>;

export const createConnectorSlice = (set: Setter, get: () => EvalStore, _api?: unknown) =>
  new ConnectorActionImpl(set, get, _api);

/** A dataset's connections and bindings, read by the connection pickers and editor. */
class ConnectorActionImpl {
  constructor(set: Setter, get: () => EvalStore, _api?: unknown) {
    void _api;
    createReplicaSlice(evalConnectorListResource, {
      actionPrefix: n('list'),
      fetcher: (datasetId) => agentEvalService.listEvalConnectors(datasetId),
      get,
      set,
      stateKey: 'evalConnectorListReplica',
      view: recordLens<EvalStore, EvalConnectorList>('evalConnectorListMap'),
    });
    createReplicaSlice(evalConnectorDetailResource, {
      actionPrefix: n('detail'),
      fetcher: ({ datasetId, id }) => agentEvalService.getEvalConnector(datasetId, id),
      get,
      set,
      stateKey: 'evalConnectorDetailReplica',
      view: recordLens<EvalStore, EvalConnectorDetail>('evalConnectorDetailMap'),
    });
    createReplicaSlice(datasetConnectorBindingsResource, {
      actionPrefix: n('bindings'),
      fetcher: (datasetId) => agentEvalService.getDatasetConnectorBindings(datasetId),
      get,
      set,
      stateKey: 'datasetConnectorBindingsReplica',
      view: recordLens<EvalStore, DatasetConnectorBindings>('datasetConnectorBindingsMap'),
    });
  }
}

export type ConnectorAction = Pick<ConnectorActionImpl, keyof ConnectorActionImpl>;
