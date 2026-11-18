import type { TaskLabelWithUsage } from '@lobot/types';

import { cacheScope, createReplicaSlice, type ReplicaLens } from '@/libs/replica';
import { type TaskLabelInput, taskLabelService } from '@/services/taskLabel';
import type { StoreSetter } from '@/store/types';

import type { TaskStore } from '../../store';
import { TASK_LABELS_KEY, taskLabelsResource } from './projection';

type Setter = StoreSetter<TaskStore>;

const LIST_PARAMS = {} as Record<string, never>;

/**
 * The registry keeps its flat `taskLabels` field as the replica view, gated by
 * `taskLabelsInit` so a loaded-but-empty registry stays distinguishable from one
 * never fetched. A scope switch clears it before paint.
 */
const taskLabelsLens: ReplicaLens<TaskStore, TaskLabelWithUsage[]> = {
  clear: () => ({ taskLabels: [], taskLabelsInit: false }),
  get: (state) => (state.taskLabelsInit ? state.taskLabels : undefined),
  keys: (state) => (state.taskLabelsInit ? [TASK_LABELS_KEY] : []),
  set: (_state, _key, data) =>
    data ? { taskLabels: data, taskLabelsInit: true } : { taskLabels: [], taskLabelsInit: false },
};

export const createTaskLabelSlice = (set: Setter, get: () => TaskStore, _api?: unknown) =>
  new TaskLabelSliceActionImpl(set, get, _api);

class TaskLabelSliceActionImpl {
  readonly #labels;

  constructor(set: Setter, get: () => TaskStore, _api?: unknown) {
    void _api;
    this.#labels = createReplicaSlice(taskLabelsResource, {
      actionPrefix: 'taskLabels',
      fetcher: () => taskLabelService.list(),
      get,
      set,
      stateKey: 'taskLabelsReplica',
      view: taskLabelsLens,
    });
  }

  /** The workspace (or personal) label registry, read through `taskLabelSelectors`. */
  useFetchTaskLabels = (enabled: boolean) => this.#labels.useSync(LIST_PARAMS, { enabled });

  refreshTaskLabels = async (): Promise<void> => {
    await this.#labels.revalidate();
  };

  createTaskLabel = async (params: TaskLabelInput) => {
    const scope = cacheScope.get();
    const label = await taskLabelService.create(params);
    // Show the new label right away; the refetch fills in usage counts. Skip
    // it if the user switched workspaces meanwhile: it belongs to the old one.
    if (cacheScope.get() === scope) {
      this.#labels.update(TASK_LABELS_KEY, (labels) =>
        labels ? [...labels, { ...label, usageCount: 0 }] : labels,
      );
    }
    void this.refreshTaskLabels();
    return label;
  };
}

export type TaskLabelSliceAction = Pick<TaskLabelSliceActionImpl, keyof TaskLabelSliceActionImpl>;
