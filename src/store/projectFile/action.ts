import type { GitWorkingTreeFiles, ProjectFileIndexResult } from '@lobechat/electron-client-ipc';
import type { ReplicaSyncOptions } from 'local-replica/zustand';

import type { ReplicaSyncResult } from '@/libs/replica';
import type { StoreSetter } from '@/store/types';
import { setNamespace } from '@/utils/storeDebug';

import { initialProjectFileState, type ProjectFileState } from './initialState';
import { ProjectFilePrivateAction } from './privateAction';
import {
  type FilesLocation,
  type FilesLocationParams,
  type GitWorkingTreeFilesParams,
  type ProjectIndexParams,
} from './projection';
import { useProjectFileStore } from './store';

const n = setNamespace('projectFile');

type Setter = StoreSetter<ProjectFileState>;

/** SWR schedule fields the replica driver forwards as is. */
type SyncOptions<TFetched, TData> = ReplicaSyncOptions<TFetched, TData> & {
  shouldRetryOnError?: boolean;
};

class ProjectFileActionImpl {
  readonly #private: ProjectFilePrivateAction;
  readonly #set: Setter;

  constructor(set: Setter, _get: () => ProjectFileState, privateAction: ProjectFilePrivateAction) {
    void _get;
    this.#set = set;
    this.#private = privateAction;
  }

  reset = (): void => {
    this.#set(initialProjectFileState, false, n('reset'));
  };

  useFetchProjectIndex = (
    params: ProjectIndexParams | null,
    options?: SyncOptions<ProjectFileIndexResult | null | undefined, ProjectFileIndexResult>,
  ): ReplicaSyncResult => this.#private.projectIndex.useSync(params, options);
}

const { getState, setState } = useProjectFileStore;

export const projectFileActions = new ProjectFileActionImpl(
  setState,
  getState,
  new ProjectFilePrivateAction(setState, getState),
);
