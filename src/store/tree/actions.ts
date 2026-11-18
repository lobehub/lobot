import { useResourceManagerStore } from '@/features/ResourceManager/store';
import { createReplicaSlice, recordLens } from '@/libs/replica';
import { subscribeCacheScope } from '@/libs/replica/cacheScopeEvents';
import { getCacheScope } from '@/libs/swr/useCacheScope';
import { fileService } from '@/services/file';
import type { StoreSetter } from '@/store/types';
import { SortType } from '@/types/files';

import { isExpandable, revalidateHierarchySearch, sortTreeItems, toTreeItem } from './items';
import {
  buildLibraryTreeSnapshot,
  libraryTreeResource,
  type LibraryTreeSnapshot,
  MAX_PERSISTED_FOLDERS,
} from './projection';
import type { TreeState } from './types';

export { isExpandable, sortTreeItems, toTreeItem, toTreeItemFromResource } from './items';

type Setter = StoreSetter<TreeState>;

export class TreeActionImpl {
  readonly #get: () => TreeState;
  readonly #set: Setter;
  readonly #snapshot;
  /** Cache scope the rendered tree was loaded under. */
  #treeScope?: string;

  constructor(set: Setter, get: () => TreeState) {
    this.#set = set;
    this.#get = get;
    this.#snapshot = createReplicaSlice(libraryTreeResource, {
      actionPrefix: 'libraryTree',
      get,
      set,
      stateKey: 'snapshotReplica',
      view: recordLens<TreeState, LibraryTreeSnapshot>('snapshotMap'),
    });

    // Nothing renders this store's replica through `useSync`, so it would never
    // see an identity switch: a cold boot can seed the tree from the last
    // user's partition before identity resolves to someone else. The store is
    // an app-lifetime singleton, so the subscription is never torn down.
    subscribeCacheScope((scope) => this.#dropStaleScope(scope));
  }

  /**
   * Drop the previous identity's snapshot and rendered tree, then load the open
   * library again under the new scope. A no-op when the tree already belongs to
   * `scope`, which is the common case: identity resolving to the scope the cold
   * boot guessed.
   */
  #dropStaleScope = (scope: string): void => {
    this.#snapshot.ensureScope(scope);
    const { knowledgeBaseId } = this.#get();
    if (!knowledgeBaseId || this.#treeScope === scope) return;

    this.reset();
    this.init(knowledgeBaseId);
  };

  /**
   * Folders whose refresh was requested while a fetch for them was already in
   * flight. That fetch captured its snapshot before the change the caller is
   * revealing (a create from the sidebar "+" during the initial root load, a
   * move landing while the destination is still loading), so dropping the
   * request would leave the new row out of the tree until something else
   * refreshed it. One follow-up runs once the in-flight fetch settles; repeated
   * requests collapse into that one.
   */
  #queuedRevalidate = new Set<string>();

  /**
   * Folders whose rendered rows are not confirmed by the server: an explorer
   * list with optimistic overlays still pending (see `reconcile`), or a folder
   * whose refresh failed during `revalidateLoaded`. The snapshot keeps their
   * last confirmed rows; the explorer's settle or a server answer for the
   * folder clears it.
   */
  #unconfirmedFolders = new Set<string>();

  /** Sidebar transactions (move, rename, delete) whose optimistic patch is not confirmed. */
  #pendingTx = new Set<symbol>();

  /**
   * Batched refreshes in flight (`revalidateLoaded`). The snapshot is written
   * once they all settle: persisting after each folder would store the rows of
   * the folders that have not been refetched yet, and for a delete only the
   * server can enumerate those rows are exactly the deleted ones.
   */
  #pendingBatch = 0;

  #runQueuedRevalidate = (folderId: string) => {
    if (!this.#queuedRevalidate.delete(folderId)) return;
    void this.revalidate(folderId);
  };

  /**
   * `children` is keyed by folder id, but the explorer addresses the current
   * folder by whatever the URL carries — usually the folder slug (see
   * `useFileStore.queryParams.parentId`). Writing under the slug leaves the
   * sidebar (which walks by id) blind to the update, so map a slug back to the
   * id of the already-loaded folder node. Unknown keys pass through unchanged.
   *
   * The loaded node wins over an existing `children[key]` entry: the explorer's
   * first list for a deep-linked folder arrives before its ancestors are
   * loaded and lands under the slug, and that stale entry must not keep every
   * later update pinned to the slug once the folder node is known.
   */
  #resolveFolderKey = (key: string): string => {
    if (!key) return '';
    const { children } = this.#get();
    for (const items of Object.values(children)) {
      const match = items.find((item) => item.isFolder && (item.id === key || item.slug === key));
      if (match) return match.id;
    }
    return key;
  };

  /**
   * Store the visible tree as the library's persisted snapshot. Runs after the
   * writes that settle a folder; the replica skips a write whose value did not
   * change, so a revalidation that confirms the tree costs no storage write.
   */
  #persistSnapshot = () => {
    if (this.#pendingTx.size > 0 || this.#pendingBatch > 0) return;
    const { children, expanded, knowledgeBaseId, snapshotMap } = this.#get();
    if (!knowledgeBaseId) return;
    // A folder showing the explorer's optimistic overlay keeps its last stored
    // rows (or is left out): a reload never repaints unconfirmed rows, and a
    // marker a navigation abandoned only pins its own folder.
    const confirmed = { ...children };
    const stored = snapshotMap[knowledgeBaseId]?.children ?? {};
    for (const id of this.#unconfirmedFolders) {
      if (stored[id]) confirmed[id] = stored[id];
      else delete confirmed[id];
    }
    const snapshot = buildLibraryTreeSnapshot(confirmed, expanded);
    if (!snapshot) return;
    this.#snapshot.update(knowledgeBaseId, () => snapshot);
  };

  /**
   * Fill in folders the network has not answered yet from the library's
   * persisted snapshot, then confirm each of them in the background. A folder
   * the network already settled keeps its fresh rows.
   */
  #seedFromSnapshot = (snapshot: LibraryTreeSnapshot) => {
    const { children, expanded } = this.#get();
    const seeded = Object.keys(snapshot.children).filter((folderId) => !children[folderId]);
    if (seeded.length === 0) return;

    const nextChildren = { ...children };
    for (const folderId of seeded)
      nextChildren[folderId] = sortTreeItems(
        snapshot.children[folderId],
        this.#get().sorter,
        this.#get().sortType,
      );
    const nextExpanded = { ...expanded };
    for (const folderId of snapshot.expanded) {
      if (nextExpanded[folderId] === undefined) nextExpanded[folderId] = true;
    }
    this.#set({ children: nextChildren, expanded: nextExpanded }, false, 'tree/seedFromSnapshot');

    // The root's own fetch (started by `init`) is already confirming it.
    for (const folderId of seeded) if (folderId) void this.#revalidateFolder(folderId);
  };

  #hydrateSnapshot = async (knowledgeBaseId: string, epoch: number) => {
    await this.preHydrate(knowledgeBaseId);
    if (this.#get().epoch !== epoch) return;
    const snapshot = this.#get().snapshotMap[knowledgeBaseId];
    if (snapshot) this.#seedFromSnapshot(snapshot);
  };

  preHydrate = (knowledgeBaseId: string): Promise<boolean> => {
    const scope = getCacheScope();
    // The slot may still hold the previous identity's rows; drop them before seeding.
    this.#snapshot.ensureScope(scope);
    return this.#snapshot.hydrate({ libraryId: knowledgeBaseId }, scope);
  };

  init = (knowledgeBaseId: string) => {
    const manager = useResourceManagerStore.getState();
    if (manager.libraryId === knowledgeBaseId) {
      this.#set({ sorter: manager.sorter, sortType: manager.sortType });
    } else {
      this.#set({ sorter: 'custom', sortType: SortType.Asc });
    }
    const current = this.#get();
    // Remounting the library already in memory (leaving the page and coming
    // back): keep the tree on screen and confirm what is loaded in the
    // background, instead of wiping it back to a skeleton.
    if (current.knowledgeBaseId === knowledgeBaseId && current.children['']) {
      this.#revalidateOnRemount();
      return;
    }

    this.#queuedRevalidate.clear();
    this.#unconfirmedFolders.clear();
    this.#pendingTx.clear();
    this.#treeScope = getCacheScope();
    const epoch = current.epoch + 1;
    this.#set(
      {
        children: {},
        epoch,
        errors: {},
        expanded: {},
        knowledgeBaseId,
        status: {},
      },
      false,
      'tree/init',
    );

    // The route loader usually hydrated the snapshot already, so the tree
    // paints in this very commit; otherwise it lands as soon as storage answers.
    const snapshot = current.snapshotMap[knowledgeBaseId];
    if (snapshot) this.#seedFromSnapshot(snapshot);
    void this.loadChildren('');
    if (!snapshot) void this.#hydrateSnapshot(knowledgeBaseId, epoch);
  };

  /**
   * Confirm the visible tree after a remount, bounded like the persisted
   * snapshot: the root and the first expanded folders are refreshed in place.
   * Open folders past the cap are collapsed and forgotten instead of left stale,
   * so a long session with hundreds of open folders does not fire one request
   * per folder on every return; expanding one again loads it fresh.
   */
  #revalidateOnRemount = () => {
    const visible = this.#loadedVisibleFolders();
    const kept = new Set(visible.slice(0, MAX_PERSISTED_FOLDERS));
    // Everything else loaded is dropped: open folders past the cap, and folders
    // loaded earlier but collapsed (or under a collapsed parent). Their rows
    // would not be refreshed here, and expanding a folder that still has rows
    // skips the fetch, so they would stay stale for the rest of the session.
    const dropped = Object.keys(this.#get().children).filter((id) => !kept.has(id));
    if (dropped.length > 0) {
      const children = { ...this.#get().children };
      const expanded = { ...this.#get().expanded };
      for (const folderId of dropped) {
        delete children[folderId];
        if (expanded[folderId]) expanded[folderId] = false;
      }
      this.#set({ children, expanded }, false, 'tree/dropUnrefreshed');
    }

    for (const folderId of visible.slice(0, MAX_PERSISTED_FOLDERS)) {
      void this.#revalidateFolder(folderId);
    }
  };

  /** The root plus every expanded folder reachable from it that has rows loaded. */
  #loadedVisibleFolders = (): string[] => {
    const { children, expanded } = this.#get();
    const result: string[] = [];
    const queue = [''];
    while (queue.length > 0) {
      const folderId = queue.shift()!;
      const items = children[folderId];
      if (!items || result.includes(folderId)) continue;
      result.push(folderId);
      for (const item of items) if (isExpandable(item) && expanded[item.id]) queue.push(item.id);
    }
    return result;
  };

  reset = () => {
    this.#queuedRevalidate.clear();
    this.#unconfirmedFolders.clear();
    this.#pendingTx.clear();
    this.#set(
      {
        children: {},
        epoch: this.#get().epoch + 1,
        errors: {},
        expanded: {},
        knowledgeBaseId: null,
        status: {},
      },
      false,
      'tree/reset',
    );
  };

  loadChildren = async (folderId: string) => {
    const { epoch, knowledgeBaseId, status, sorter, sortType } = this.#get();
    if (status[folderId] === 'loading') return;

    // Clear any prior error for this folder so a retry doesn't keep the failure marker.
    const nextErrors = { ...this.#get().errors };
    delete nextErrors[folderId];
    this.#set(
      { errors: nextErrors, status: { ...this.#get().status, [folderId]: 'loading' } },
      false,
      'tree/loadChildren/start',
    );

    try {
      const response = await fileService.getKnowledgeItems({
        includeContentPreview: false,
        knowledgeBaseId: knowledgeBaseId ?? undefined,
        parentId: folderId || null,
        showFilesInKnowledgeBase: false,
        sorter,
        sortType,
      });

      if (this.#get().epoch !== epoch) return;

      this.#set(
        {
          children: {
            ...this.#get().children,
            [folderId]: sortTreeItems(
              response.items.map(toTreeItem),
              this.#get().sorter,
              this.#get().sortType,
            ),
          },
          status: { ...this.#get().status, [folderId]: 'idle' },
        },
        false,
        'tree/loadChildren/success',
      );
      this.#unconfirmedFolders.delete(folderId);
      this.#persistSnapshot();
      this.#runQueuedRevalidate(folderId);
    } catch (error) {
      if (this.#get().epoch !== epoch) return;
      console.error(`Failed to load children for ${folderId}:`, error);
      // Mark the folder as errored (was swallowed to 'idle', which read as a false
      // "empty folder" — Read §1.1 failure-as-empty). Keep the error so the view can
      // render a failure state with Retry instead of the "add folder" empty.
      this.#set(
        {
          errors: { ...this.#get().errors, [folderId]: error },
          status: { ...this.#get().status, [folderId]: 'error' },
        },
        false,
        'tree/loadChildren/error',
      );
      this.#runQueuedRevalidate(folderId);
    }
  };

  revalidate = async (folderKey: string) => {
    void revalidateHierarchySearch();
    await this.#revalidateFolder(this.#resolveFolderKey(folderKey));
  };

  /**
   * Refetch one folder while its current rows stay on screen. A failure keeps
   * them (status back to idle) rather than flagging the folder as errored.
   * Resolves `true` only when the folder's rows now come from this refetch.
   */
  #revalidateFolder = async (folderId: string): Promise<boolean> => {
    const { epoch, knowledgeBaseId, status, sorter, sortType } = this.#get();
    if (status[folderId] === 'loading' || status[folderId] === 'revalidating') {
      this.#queuedRevalidate.add(folderId);
      return false;
    }

    this.#set(
      { status: { ...this.#get().status, [folderId]: 'revalidating' } },
      false,
      'tree/revalidate/start',
    );

    try {
      const response = await fileService.getKnowledgeItems({
        includeContentPreview: false,
        knowledgeBaseId: knowledgeBaseId ?? undefined,
        parentId: folderId || null,
        showFilesInKnowledgeBase: false,
        sorter,
        sortType,
      });

      if (this.#get().epoch !== epoch) return false;

      this.#set(
        {
          children: {
            ...this.#get().children,
            [folderId]: sortTreeItems(
              response.items.map(toTreeItem),
              this.#get().sorter,
              this.#get().sortType,
            ),
          },
          status: { ...this.#get().status, [folderId]: 'idle' },
        },
        false,
        'tree/revalidate/success',
      );
      this.#unconfirmedFolders.delete(folderId);
      this.#persistSnapshot();
      this.#runQueuedRevalidate(folderId);
      return true;
    } catch {
      if (this.#get().epoch !== epoch) return false;
      this.#set(
        { status: { ...this.#get().status, [folderId]: 'idle' } },
        false,
        'tree/revalidate/error',
      );
      this.#runQueuedRevalidate(folderId);
      return false;
    }
  };
}
