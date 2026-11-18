import { type NotebookDocument } from '@lobot/types';

import { createReplicaSlice, recordLens, type ReplicaSyncResult } from '@/libs/replica';
import { notebookService } from '@/services/notebook';
import { type StoreSetter } from '@/store/types';
import { setNamespace } from '@/utils/storeDebug';

import { notebookDocumentsResource } from './projection';
import { type NotebookStore } from './store';

const n = setNamespace('notebook');

type Setter = StoreSetter<NotebookStore>;
export const createNotebookAction = (set: Setter, get: () => NotebookStore, _api?: unknown) =>
  new NotebookActionImpl(set, get, _api);

class NotebookActionImpl {
  /** One topic's documents, persisted per `topicId` (`notebookMap`). */
  readonly #documents;

  constructor(set: Setter, get: () => NotebookStore, _api?: unknown) {
    void _api;
    this.#documents = createReplicaSlice(notebookDocumentsResource, {
      actionPrefix: n('notebookDocuments'),
      fetcher: (topicId) =>
        notebookService.listDocuments({ topicId }).then((result) => result.data),
      get,
      set,
      stateKey: 'notebookDocumentsReplica',
      view: recordLens<NotebookStore, NotebookDocument[]>('notebookMap'),
    });
  }

  /**
   * Fetch orchestration for one topic: the persisted copy paints the first
   * frame and the network only confirms. Read the documents with
   * `notebookSelectors`, not from the return value.
   */
  useFetchDocuments = (topicId: string | undefined): ReplicaSyncResult =>
    this.#documents.useSync(topicId ?? null, { revalidateOnFocus: false });
}

export type NotebookAction = Pick<NotebookActionImpl, keyof NotebookActionImpl>;
