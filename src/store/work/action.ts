import type { ReplicaSyncResult } from '@/libs/replica';
import type { StoreSetter } from '@/store/types';
import { setNamespace } from '@/utils/storeDebug';

import { initialWorkState, type WorkState } from './initialState';
import { WorkPrivateAction } from './privateAction';
import type { ShareVisitorDocumentParams } from './projection';
import { useWorkStore } from './store';

const n = setNamespace('work');

type Setter = StoreSetter<WorkState>;

/**
 * Work lists the UI paints from a local copy: the workspace gallery, the
 * project dashboard's latest works, and the working sidebar's history and
 * version timelines. Each is a replica (first frame from storage, the network
 * confirms); Work mutations keep revalidating them through the `work:` sync
 * keys (`workService.refresh*`).
 */
class WorkActionImpl {
  readonly #get: () => WorkState;
  readonly #private: WorkPrivateAction;
  readonly #set: Setter;

  constructor(set: Setter, get: () => WorkState, privateAction: WorkPrivateAction) {
    this.#get = get;
    this.#set = set;
    this.#private = privateAction;
  }

  /**
   * Before a Work change refreshes the `work:` sync keys: drop every gallery
   * filter's loaded tail pages. Only the head page is re-requested, and a tail
   * kept behind an unchanged head would go on showing a Work as it was (e.g. a
   * card whose document was just deleted). The tail loads again on scroll.
   */
  collapseWorkspaceWorksTails = (): void => {
    for (const [key, data] of Object.entries(this.#get().workspaceWorksMap)) {
      if (data.currentPage > 0) this.#private.workspaceWorks.collapse(key);
    }
  };

  /**
   * A deleted Work card leaves every list that showed it — including the
   * persisted rows of lists not on screen, so a reload cannot paint it again.
   */
  removeWork = (id: string): void => {
    this.#private.works.remove(id);
    this.#private.versions.remove(id);
  };

  reset = (): void => {
    this.#set(initialWorkState, false, n('reset'));
  };

  /** Read the body with `workSelectors.shareVisitorDocument(params)`. */
  useFetchShareVisitorDocument = (params: ShareVisitorDocumentParams): ReplicaSyncResult =>
    this.#private.shareVisitorDocument.useSync(params);
}

const { getState, setState } = useWorkStore;

export const workActions = new WorkActionImpl(
  setState,
  getState,
  new WorkPrivateAction(setState, getState),
);
