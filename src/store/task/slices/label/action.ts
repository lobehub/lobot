import type { TaskLabelWithUsage } from '@lobot/types';

import { mutate, useClientDataSWR } from '@/libs/swr';
import { taskLabelKeys } from '@/libs/swr/keys';
import { type TaskLabelInput, taskLabelService } from '@/services/taskLabel';
import type { StoreSetter } from '@/store/types';

import type { TaskStore } from '../../store';

type Setter = StoreSetter<TaskStore>;

export const createTaskLabelSlice = (set: Setter, get: () => TaskStore, _api?: unknown) =>
  new TaskLabelSliceActionImpl(set, get, _api);

class TaskLabelSliceActionImpl {
  readonly #get: () => TaskStore;
  readonly #set: Setter;

  constructor(set: Setter, get: () => TaskStore, _api?: unknown) {
    void _api;
    this.#set = set;
    this.#get = get;
  }

  /**
   * The workspace (or personal) label registry. SWR already keys the request by
   * workspace; `scope` is the workspace the caller rendered with, so a response
   * that lands after the user switched away is not written into the shared slot.
   */
  useFetchTaskLabels = (enabled: boolean, scope: string | null) =>
    useClientDataSWR<TaskLabelWithUsage[]>(
      enabled ? taskLabelKeys.list() : null,
      () => taskLabelService.list(),
      {
        onSuccess: (data: TaskLabelWithUsage[]) => {
          if (this.#get().taskLabelsScope !== scope) return;
          this.#set({ taskLabels: data, taskLabelsInit: true }, false, 'useFetchTaskLabels');
        },
      },
    );

  /** Point the registry at another workspace, dropping the previous one's labels. */
  internal_resetTaskLabelsScope = (scope: string | null) => {
    if (this.#get().taskLabelsScope === scope) return;
    this.#set(
      { taskLabels: [], taskLabelsInit: false, taskLabelsScope: scope },
      false,
      'resetTaskLabelsScope',
    );
  };

  refreshTaskLabels = async (): Promise<void> => {
    await mutate(taskLabelKeys.list());
  };

  createTaskLabel = async (params: TaskLabelInput) => {
    const scope = this.#get().taskLabelsScope;
    const label = await taskLabelService.create(params);
    // Show the new label right away; the refetch fills in usage counts. Skip
    // it if the user switched workspaces meanwhile: it belongs to the old one.
    if (this.#get().taskLabelsScope === scope) {
      this.#set(
        (state) => ({ taskLabels: [...state.taskLabels, { ...label, usageCount: 0 }] }),
        false,
        'createTaskLabel',
      );
    }
    void this.refreshTaskLabels();
    return label;
  };
}

export type TaskLabelSliceAction = Pick<TaskLabelSliceActionImpl, keyof TaskLabelSliceActionImpl>;
