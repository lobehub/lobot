import {
  CUSTOM_DOCUMENT_FILE_TYPE,
  CUSTOM_FOLDER_FILE_TYPE,
  DERIVED_DOCUMENT_SOURCE_TYPE,
} from '@lobechat/const';
import { createNanoId } from '@lobechat/utils';
import isEqual from 'fast-deep-equal';

import { createReplicaSlice, recordLens } from '@/libs/replica';
import { documentService } from '@/services/document';
import { type StoreSetter } from '@/store/types';
import { type LobeDocument } from '@/types/document';
import { DocumentSourceType } from '@/types/document';
import { type ResourceItem } from '@/types/resource';
import { type DocumentItem } from '@/types/serverData';
import { setNamespace } from '@/utils/storeDebug';
import { isTrpcErrorCode } from '@/utils/trpcError';

import { type FileStore, useFileStore } from '../../store';
import { getResourceQueryKey } from '../resource/utils';
import { type FileDocumentDetail, fileDocumentResource } from './projection';

const n = setNamespace('document');

type Setter = StoreSetter<FileStore>;

/**
 * Result of {@link DocumentActionImpl.useFetchDocumentDetail}.
 *
 * `data` is the replica view, read from the store (not from the hook's return)
 * so the first frame paints from the persisted projection and the network only
 * confirms it: `undefined` = nothing loaded for this id yet, `null` = the
 * server answered "not found".
 */
interface UseFetchDocumentDetailResult {
  data: LobeDocument | null | undefined;
  error: unknown;
  /** SWR's `isLoading` semantics: no value yet and no error. */
  isLoading: boolean;
  isValidating: boolean;
  /** Re-run the network sync for this document. */
  mutate: () => Promise<unknown>;
}

/**
 * Shape the resource explorer merges onto its list rows. Kept separate from
 * `LobeDocument`: a list row also needs the library it belongs to, which the
 * document row itself does not carry.
 */
interface ResourceDocumentSnapshot {
  content?: string | null;
  createdAt?: Date | string;
  editorData?: LobeDocument['editorData'] | string;
  fileType?: string;
  id: string;
  knowledgeBaseId?: string;
  metadata?: LobeDocument['metadata'] | null;
  parentId?: string | null;
  slug?: string | null;
  source?: string | null;
  title?: string | null;
  totalCharCount?: number;
  updatedAt?: Date | string;
}

export const createDocumentSlice = (set: Setter, get: () => FileStore, _api?: unknown) =>
  new DocumentActionImpl(set, get, _api);

class DocumentActionImpl {
  /**
   * One document row per id. The replica owns every transition of `documentMap`
   * (hydrate → first frame, server replace, optimistic rename, delete).
   */
  readonly #documents;

  constructor(set: Setter, get: () => FileStore, _api?: unknown) {
    void _api;
    this.#documents = createReplicaSlice(fileDocumentResource, {
      actionPrefix: n('fileDocument'),
      fetcher: async (id) => {
        const row = await documentService.getDocumentById(id);

        return { document: row ? this.#toLobeDocument(row) : null };
      },
      get,
      set,
      stateKey: 'fileDocumentReplica',
      // The server response is authoritative for a resumed / refocused sync.
      // Ordering comes from the replica's mutation ordering — a local write
      // still in flight is preserved by the optimistic overlay and rebased onto
      // this value — never from comparing a client-clock `updatedAt` against a
      // server-clock one.
      merge: (incoming, confirmed) => (isEqual(incoming, confirmed) ? undefined : incoming),
      // A "not found" answer is a page state, not a document: never persist it,
      // and `null` (not `undefined`) tells the engine to drop any previously
      // persisted projection, so a later hydrate cannot paint a document the
      // server no longer has.
      toPersisted: (data) => (data.document ? data : null),
      view: recordLens<FileStore, FileDocumentDetail>('documentMap'),
    });
  }

  /**
   * Normalize a server row into the store's document shape. Kept in one place so
   * the sync path and the create/duplicate paths produce the same entry.
   */
  #toLobeDocument = (row: DocumentItem): LobeDocument => ({
    content: row.content || null,
    createdAt: row.createdAt ? new Date(row.createdAt) : new Date(),
    editorData:
      typeof row.editorData === 'string' ? JSON.parse(row.editorData) : (row.editorData ?? null),
    fileType: row.fileType,
    filename: row.title || row.filename || 'Untitled',
    id: row.id,
    metadata: row.metadata || {},
    source: 'document',
    sourceType: DocumentSourceType.EDITOR,
    title: row.title || '',
    totalCharCount: row.content?.length || 0,
    totalLineCount: 0,
    updatedAt: row.updatedAt ? new Date(row.updatedAt) : new Date(),
  });

  /**
   * Sync one document through its replica. The view is the source of truth, so
   * a reload or a return to the route paints from the persisted projection on
   * the first frame and the network only confirms it.
   */
  useFetchDocumentDetail = (documentId: string | undefined): UseFetchDocumentDetailResult => {
    const entry = useFileStore((s) => (documentId ? s.documentMap[documentId] : undefined));

    const sync = this.#documents.useSync(documentId, {
      // A page made private to another member (FORBIDDEN) or deleted (NOT_FOUND)
      // must not keep painting from the projection: settle it like a "not found"
      // answer (evicting the persisted row) rather than `remove`, which would also
      // unregister this mounted query and drop a retry once access is restored.
      // Transient failures keep the cached row.
      onError: (error, { key, scope }) => {
        if (key && (isTrpcErrorCode(error, 'FORBIDDEN') || isTrpcErrorCode(error, 'NOT_FOUND')))
          this.#documents.replace(key, { document: null }, scope);
      },
      // Keep an open page in step with other writers.
      revalidateOnFocus: true,
    });

    return {
      data: entry?.document,
      error: sync.error,
      isLoading: Boolean(documentId) && entry === undefined && sync.error == null,
      isValidating: sync.isValidating,
      mutate: sync.revalidate,
    };
  };
}

export type DocumentAction = Pick<DocumentActionImpl, keyof DocumentActionImpl>;
