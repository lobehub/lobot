import {
  buildFolderTree,
  createNanoId,
  sanitizeFolderName,
  topologicalSortFolders,
} from '@lobechat/utils';
import { toast, type ToastInstance } from '@lobehub/ui';
import { t } from 'i18next';
import pMap from 'p-map';

import { FILE_UPLOAD_BLACKLIST, MAX_UPLOAD_FILE_COUNT } from '@/const/file';
import {
  createReplicaSlice,
  linkReplicaEntity,
  recordLens,
  type ReplicaEntityAdapter,
  type ReplicaLens,
  type ReplicaPageResult,
  type ReplicaSyncResult,
} from '@/libs/replica';
import { documentService } from '@/services/document';
import { FileService, fileService } from '@/services/file';
import { ragService } from '@/services/rag';
import { type UploadFileListDispatch } from '@/store/file/reducers/uploadFileList';
import { uploadFileListReducer } from '@/store/file/reducers/uploadFileList';
import { type StoreSetter } from '@/store/types';
import { type FileListItem, type QueryFileListParams } from '@/types/files';
import { type ResourceItem } from '@/types/resource';
import { isChunkingSupported } from '@/utils/isChunkingSupported';
import { isTrpcErrorCode } from '@/utils/trpcError';
import { unzipFile } from '@/utils/unzipFile';

import { type FileStore, useFileStore } from '../../store';
import {
  DEFAULT_FILE_LIST_PAGE_SIZE,
  FILE_LIST_KEY,
  fileDetailResource,
  type FileDetailValue,
  type FileListData,
  type FileListParams,
  fileListResource,
  folderBreadcrumbResource,
  type FolderCrumb,
} from './projection';
import { fileManagerSelectors } from './selectors';

const serverFileService = new FileService();

interface RefreshFileListOptions {
  revalidateResources?: boolean;
}

/**
 * Result of {@link FileManageActionImpl.useFetchKnowledgeItem}.
 *
 * `data` is the replica view, read from the store (not from the hook's return)
 * so a reload or a return to the route paints the persisted projection first and
 * the network only confirms it: `undefined` = nothing loaded for this id yet,
 * `null` on the server is mapped to `undefined`.
 */
interface UseFetchKnowledgeItemResult {
  data: FileListItem | undefined;
  error: unknown;
  /** SWR's `isLoading` semantics: no value yet and no error. */
  isLoading: boolean;
  isValidating: boolean;
  /** Re-run the network sync for this item. */
  mutate: () => Promise<unknown>;
}

/** Result of {@link FileManageActionImpl.useFetchFolderBreadcrumb}. */
interface UseFetchFolderBreadcrumbResult {
  /** The ancestor chain; `[]` while nothing is loaded or the folder is at the root. */
  data: FolderCrumb[];
  error: unknown;
  isLoading: boolean;
  isValidating: boolean;
  mutate: () => Promise<unknown>;
}

const EMPTY_CRUMBS: FolderCrumb[] = [];

/**
 * The knowledge-item list lives in a flat array (`fileList`) with its paging
 * bookkeeping in a sibling field (`fileListMeta`), so every reader of the list
 * keeps the shape it already had while the replica owns hydration, paging and
 * optimistic overlays.
 */
const fileListLens: ReplicaLens<FileStore, FileListData> = {
  clear: () => ({ fileList: [], fileListMeta: undefined }),
  get: (state) => {
    if (!state.fileListMeta) return undefined;
    return { ...state.fileListMeta, items: state.fileList };
  },
  set: (_state, _key, data) => {
    if (data === undefined) return { fileList: [], fileListMeta: undefined };
    const { items, ...meta } = data;
    return { fileList: items, fileListMeta: meta };
  },
};

/**
 * How one knowledge item sits in `fileDetailMap[id]`. A "not found" answer
 * (`file: null`) is a page state, not a row: deleting the entity drops the whole
 * value, and patching it maps the row it wraps.
 */
const fileDetailEntity: ReplicaEntityAdapter<FileDetailValue, FileListItem> = {
  has: (data, id) => !!data.file && data.file.id === id,
  map: (data, _id, fn) => {
    if (!data.file) return data;
    const next = fn(data.file);
    if (next === undefined) return undefined;
    if (next === data.file) return data;
    return { ...data, file: next };
  },
};

type Setter = StoreSetter<FileStore>;
export const createFileManageSlice = (set: Setter, get: () => FileStore, _api?: unknown) =>
  new FileManageActionImpl(set, get, _api);

class FileManageActionImpl {
  readonly #get: () => FileStore;
  /**
   * The knowledge-item list is a `local-replica` paged resource: the
   * persisted head page paints before the network answers and "load more"
   * appends further pages through the engine instead of a hand-rolled offset.
   */
  readonly #fileList;
  /**
   * By-id knowledge-item detail. Linked with the list below, so a rename or a
   * move updates every copy of the same file the client holds.
   */
  readonly #fileDetail;
  readonly #folderBreadcrumb;
  /** The same file lives in the list and in every loaded detail entry. */
  readonly #fileEntity;
  readonly #set: Setter;

  constructor(set: Setter, get: () => FileStore, _api?: unknown) {
    void _api;
    this.#set = set;
    this.#get = get;

    this.#fileList = createReplicaSlice(fileListResource, {
      actionPrefix: 'fileList',
      fetcher: (params, cursor) => this.#fetchFileListPage(params, cursor),
      get,
      set,
      stateKey: 'fileListReplica',
      view: fileListLens,
    });
    this.#fileDetail = createReplicaSlice(fileDetailResource, {
      actionPrefix: 'fileDetail',
      entity: fileDetailEntity,
      fetcher: async (id) => ({ file: await this.#fetchFileDetail(id) }),
      get,
      set,
      stateKey: 'fileDetailReplica',
      // A "not found" answer is a page state, not a row: the view keeps it so
      // consumers stop rendering, but the prior persisted projection must go.
      // `null` drops any stored row, so a reload cannot paint a file the server
      // has already confirmed missing.
      toPersisted: (data) => (data.file ? data : null),
      view: recordLens<FileStore, FileDetailValue>('fileDetailMap'),
    });
    this.#folderBreadcrumb = createReplicaSlice(folderBreadcrumbResource, {
      actionPrefix: 'folderBreadcrumb',
      fetcher: (slug) => serverFileService.getFolderBreadcrumb(slug),
      get,
      set,
      stateKey: 'folderBreadcrumbReplica',
      view: recordLens<FileStore, FolderCrumb[]>('folderBreadcrumbMap'),
    });
    this.#fileEntity = linkReplicaEntity<FileListItem>([this.#fileList, this.#fileDetail]);
  }

  #resolveChunkTargetId = async (id: string): Promise<string> => {
    // Reuse the selector so local resolution consults every store list
    // (fileList → resourceMap → resourceMap-by-fileId → resourceList).
    const localResource = fileManagerSelectors.getFileByChunkTargetId(id)(this.#get());
    if (localResource?.fileId) return localResource.fileId;
    if (!id.startsWith('docs_')) return id;

    try {
      const resource = await fileService.getKnowledgeItem(id);
      return resource?.fileId ?? id;
    } catch {
      return id;
    }
  };

  #resolveChunkTargetIds = async (ids: string[]): Promise<string[]> =>
    Promise.all(ids.map((id) => this.#resolveChunkTargetId(id)));

  /**
   * One knowledge item, with the server's "not found" mapped to a confirmed
   * absence (`{ file: null }`) instead of a rejection. `getKnowledgeItem` throws
   * `NOT_FOUND` for a deleted or inaccessible `file_*` id, which would otherwise
   * leave the hydrated projection in place and surface only a revalidation
   * error — consumers ignore that error and keep rendering the stale file.
   */
  #fetchFileDetail = async (id: string): Promise<FileListItem | null> => {
    try {
      return (await serverFileService.getKnowledgeItem(id)) ?? null;
    } catch (error) {
      if (isTrpcErrorCode(error, 'NOT_FOUND')) return null;
      throw error;
    }
  };

  /**
   * One page of the knowledge-item list; `cursor` is the raw window start
   * (`undefined` = head page), which the next request continues from.
   */
  #fetchFileListPage = async (
    params: FileListParams,
    cursor?: number,
  ): Promise<ReplicaPageResult<FileListItem, number>> => {
    const { pageSize, ...filters } = params;
    const offset = cursor ?? 0;
    const response = await serverFileService.getKnowledgeItems({
      ...filters,
      includeContentPreview: filters.includeContentPreview ?? false,
      limit: pageSize,
      offset,
    });

    return {
      items: response.items,
      // The endpoint pages by row offset, reports `hasMore` rather than a total,
      // and drops rows *after* paging (Inbox folders), so `items.length` counts
      // visible rows while the next window starts at a raw offset. Carry the raw
      // offset forward — the whole server window was consumed, filtered or not —
      // and let exhaustion be exactly the server's `hasMore`. Anything derived
      // from `items.length` would both stall on a filtered page and keep
      // "load more" alive past the end of the list.
      nextCursor: response.hasMore ? offset + pageSize : null,
    };
  };

  cancelUpload = (id: string): void => {
    const { dockUploadFileList, dispatchDockFileList } = this.#get();
    const uploadItem = dockUploadFileList.find((item) => item.id === id);

    if (uploadItem?.abortController) {
      uploadItem.abortController.abort();
    }

    // Update status to cancelled
    dispatchDockFileList({
      id,
      status: 'cancelled',
      type: 'updateFileStatus',
    });
  };

  cancelUploads = (ids: string[]): void => {
    if (ids.length === 0) return;

    const { dockUploadFileList, dispatchDockFileList } = this.#get();
    const cancellableIds = new Set(ids);
    const cancelledIds: string[] = [];

    for (const uploadItem of dockUploadFileList) {
      if (!cancellableIds.has(uploadItem.id)) continue;

      uploadItem.abortController?.abort();
      cancelledIds.push(uploadItem.id);
    }

    if (cancelledIds.length === 0) return;

    dispatchDockFileList({
      ids: cancelledIds,
      status: 'cancelled',
      type: 'updateFileStatuses',
    });
  };

  retryDockUpload = async (id: string): Promise<void> => {
    const { dispatchDockFileList, dockUploadFileList } = this.#get();
    const item = dockUploadFileList.find((file) => file.id === id);
    if (!item || item.status !== 'error' || item.errorCode) return;

    const abortController = new AbortController();
    dispatchDockFileList({
      id,
      type: 'updateFile',
      value: {
        abortController,
        error: undefined,
        errorCode: undefined,
        status: 'pending',
        uploadState: undefined,
      },
    });

    try {
      const result = await this.#get().uploadWithProgress({
        abortController,
        file: item.file,
        knowledgeBaseId: item.knowledgeBaseId,
        onStatusUpdate: dispatchDockFileList,
        parentId: item.parentId,
        uploadId: id,
        visibility: item.visibility,
      });

      if (!result) return;
      await this.#get().refreshFileList({ revalidateResources: true });

      if (isChunkingSupported({ fileType: item.file.type, name: item.file.name })) {
        await this.#get().parseFilesToChunks([result.id], { skipExist: false });
      }
    } catch (error) {
      console.error(error);
      dispatchDockFileList({
        id,
        type: 'updateFile',
        value: { error: t('upload.uploadFailed', { ns: 'error' }), status: 'error' },
      });
    }
  };

  dispatchDockFileList = (payload: UploadFileListDispatch): void => {
    const nextValue = uploadFileListReducer(this.#get().dockUploadFileList, payload);
    if (nextValue === this.#get().dockUploadFileList) return;

    this.#set({ dockUploadFileList: nextValue }, false, `dispatchDockFileList/${payload.type}`);
  };

  parseFilesToChunks = async (ids: string[], params?: { skipExist?: boolean }): Promise<void> => {
    const chunkTargetIds = await this.#resolveChunkTargetIds(ids);
    // toggle file ids
    this.#get().toggleParsingIds(chunkTargetIds);

    // parse files
    const pools = chunkTargetIds.map(async (id) => {
      try {
        await ragService.createParseFileTask(id, params?.skipExist);
      } catch (e) {
        console.error(e);
      }
    });

    await Promise.all(pools);
    await this.#get().refreshFileList();
    this.#get().toggleParsingIds(chunkTargetIds, false);
  };

  refreshFileList = async (options?: RefreshFileListOptions): Promise<void> => {
    await this.#fileList.revalidate();

    if (options?.revalidateResources === false) return;

    const { revalidateResources } = await import('../resource/hooks');
    await revalidateResources();
  };

  /**
   * Drop cached knowledge items without calling the server, for a deletion that
   * was already confirmed elsewhere (the resource explorer has its own delete
   * paths). Both of this slice's replicas persist by id, so leaving a deleted
   * row behind lets a later direct visit repaint it until a NOT_FOUND answer
   * arrives — and offline that answer never comes. Evicts the list row and every
   * loaded detail together, exactly like a local delete.
   */
  forgetKnowledgeItems = (ids: string[]): void => {
    for (const id of ids) this.#fileEntity.remove(id);
  };

  toggleParsingIds = (ids: string[], loading?: boolean): void => {
    this.#set((state) => {
      const nextValue = new Set(state.creatingChunkingTaskIds);

      ids.forEach((id: string) => {
        if (typeof loading === 'undefined') {
          if (nextValue.has(id)) nextValue.delete(id);
          else nextValue.add(id);
        } else {
          if (loading) nextValue.add(id);
          else nextValue.delete(id);
        }
      });

      return { creatingChunkingTaskIds: Array.from(nextValue.values()) };
    });
  };

  /**
   * Fetch orchestration for a folder's ancestor chain. Hydrates the persisted
   * projection, then revalidates; the chain lands in `folderBreadcrumbMap` and
   * this hook returns it for the breadcrumb surfaces.
   */
  useFetchFolderBreadcrumb = (slug?: string | null): UseFetchFolderBreadcrumbResult => {
    const entry = useFileStore((s) => (slug ? s.folderBreadcrumbMap[slug] : undefined));
    const sync = this.#folderBreadcrumb.useSync(slug ?? null);

    return {
      data: entry ?? EMPTY_CRUMBS,
      error: sync.error,
      isLoading: Boolean(slug) && entry === undefined && sync.error == null,
      isValidating: sync.isValidating,
      mutate: sync.revalidate,
    };
  };

  /**
   * Sync one knowledge item through its replica. The view is the source of
   * truth, so a reload or a return to the route paints from the persisted
   * projection on the first frame and the network only confirms it.
   *
   * Keeps SWR's `{ data, error, isLoading, mutate }` shape for its callers while
   * reading `data` from the store view — a "not found" answer reads as `undefined`.
   */
  useFetchKnowledgeItem = (id?: string): UseFetchKnowledgeItemResult => {
    const entry = useFileStore((s) => (id ? s.fileDetailMap[id] : undefined));
    const sync = this.#fileDetail.useSync(id ?? null);

    return {
      data: entry?.file ?? undefined,
      error: sync.error,
      isLoading: Boolean(id) && entry === undefined && sync.error == null,
      isValidating: sync.isValidating,
      mutate: sync.revalidate,
    };
  };
}

export type FileManageAction = Pick<FileManageActionImpl, keyof FileManageActionImpl>;
