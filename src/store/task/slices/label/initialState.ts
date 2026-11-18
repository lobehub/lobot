import type { TaskLabelWithUsage } from '@lobot/types';

import { createReplicaState, type ReplicaState } from '@/libs/replica';

export interface TaskLabelSliceState {
  /** The label registry of the active scope (groups included), registry order. */
  taskLabels: TaskLabelWithUsage[];
  /** The registry has loaded once, so an empty array means "no labels". */
  taskLabelsInit: boolean;
  /** Replica bookkeeping of the registry (`taskLabels` is its view). */
  taskLabelsReplica: ReplicaState<TaskLabelWithUsage[]>;
}

export const initialTaskLabelSliceState: TaskLabelSliceState = {
  taskLabels: [],
  taskLabelsInit: false,
  taskLabelsReplica: createReplicaState(),
};
