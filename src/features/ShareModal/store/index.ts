import { shallow } from 'zustand/shallow';
import { createWithEqualityFn } from 'zustand/traditional';

import {
  createReplicaSlice,
  createReplicaState,
  recordLens,
  type ReplicaState,
  type ReplicaSyncResult,
} from '@/libs/replica';
import { messageService } from '@/services/message';

import { exportToolPayloadsResource, type ToolPayloadMap } from './projection';

interface ExportToolPayloadsState {
  toolPayloadsMap: Record<string, ToolPayloadMap>;
  toolPayloadsReplica: ReplicaState<ToolPayloadMap>;
}

export const useExportToolPayloadsStore = createWithEqualityFn<ExportToolPayloadsState>()(
  () => ({ toolPayloadsMap: {}, toolPayloadsReplica: createReplicaState() }),
  shallow,
);

const toolPayloadsSlice = createReplicaSlice(exportToolPayloadsResource, {
  actionPrefix: 'shareExportToolPayloads',
  fetcher: ({ ids }) => messageService.getToolResultPayloads(ids),
  get: useExportToolPayloadsStore.getState,
  set: useExportToolPayloadsStore.setState,
  stateKey: 'toolPayloadsReplica',
  view: recordLens<ExportToolPayloadsState, ToolPayloadMap>('toolPayloadsMap'),
});

export const exportToolPayloadsSelectors = {
  /** `undefined` until the payloads of this id set answer. */
  payloads: (ids: string[]) => (s: ExportToolPayloadsState) =>
    ids.length > 0 ? s.toolPayloadsMap[ids.join(',')] : undefined,
};

export const useFetchExportToolPayloads = (ids: string[]): ReplicaSyncResult =>
  toolPayloadsSlice.useSync(ids.length > 0 ? { ids } : null, { revalidateOnFocus: false });
