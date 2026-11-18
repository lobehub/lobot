'use client';

import { DOCUMENT_HISTORY_QUERY_LIST_LIMIT } from '@/const/documentHistory';
import { createReplicaSlice, recordLens } from '@/libs/replica';
import { documentService } from '@/services/document';
import type { StoreSetter } from '@/store/types';
import type { CompareHistoryItemsOutput, ListHistoryOutput } from '@/types/serverData';
import { setNamespace } from '@/utils/storeDebug';

import type { DocumentStore } from '../../store';
import { documentHistoryCompareResource, documentHistoryListResource } from './projection';

const n = setNamespace('document/history');

type Setter = StoreSetter<DocumentStore>;

export interface UseFetchDocumentHistoryResult<TData> {
  data: TData | undefined;
  error: unknown;
  /** No value painted yet (neither the persisted copy nor the network) and no error. */
  isLoading: boolean;
}

export const createDocumentHistorySlice = (set: Setter, get: () => DocumentStore, _api?: unknown) =>
  new DocumentHistoryActionImpl(set, get, _api);

/**
 * The version history of a document: its version list and head-vs-version
 * diffs live in replicas next to the document detail, so reopening the
 * history panel (or a compare) after a reload paints the last copy first.
 */
class DocumentHistoryActionImpl {
  constructor(set: Setter, get: () => DocumentStore, _api?: unknown) {
    void _api;
    createReplicaSlice(documentHistoryListResource, {
      actionPrefix: n('historyList'),
      fetcher: (documentId) =>
        documentService.listDocumentHistory({
          documentId,
          includeCurrent: true,
          limit: DOCUMENT_HISTORY_QUERY_LIST_LIMIT,
        }),
      get,
      set,
      stateKey: 'historyListReplica',
      view: recordLens<DocumentStore, ListHistoryOutput>('historyListMap'),
    });
    createReplicaSlice(documentHistoryCompareResource, {
      actionPrefix: n('historyCompare'),
      fetcher: ({ documentId, historyId }) =>
        documentService.compareDocumentHistoryItems({
          documentId,
          fromHistoryId: 'head',
          toHistoryId: historyId,
        }),
      get,
      set,
      stateKey: 'historyCompareReplica',
      view: recordLens<DocumentStore, CompareHistoryItemsOutput>('historyCompareMap'),
    });
  }
}

export type DocumentHistoryAction = Pick<
  DocumentHistoryActionImpl,
  keyof DocumentHistoryActionImpl
>;
