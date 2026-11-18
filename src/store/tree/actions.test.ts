import { CUSTOM_FOLDER_FILE_TYPE } from '@lobechat/const';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { hierarchySearchResource } from '@/features/ResourceManager/store/projection';
import type * as ReplicaModule from '@/libs/replica';
import { createReplicaState } from '@/libs/replica';
import { SortType } from '@/types/files';

import {
  isExpandable,
  sortTreeItems,
  toTreeItem,
  toTreeItemFromResource,
  TreeActionImpl,
} from './actions';
import type { TreeState } from './types';

const {
  mockApplyMovedResourceToCaches,
  mockCollapseHierarchySearch,
  mockDeleteResources,
  mockGetKnowledgeItems,
  mockPatchSearchHit,
  mockRefreshFileList,
  mockResourceMove,
  mockRevalidateReplica,
  mockSetSort,
  mockReorder,
  mockStoreMove,
  mockUpdateResource,
} = vi.hoisted(() => ({
  mockApplyMovedResourceToCaches: vi.fn(),
  mockCollapseHierarchySearch: vi.fn(),
  mockDeleteResources: vi.fn(),
  mockGetKnowledgeItems: vi.fn(),
  mockPatchSearchHit: vi.fn(),
  mockRefreshFileList: vi.fn(),
  mockResourceMove: vi.fn(),
  mockRevalidateReplica: vi.fn(),
  mockSetSort: vi.fn(),
  mockReorder: vi.fn(),
  mockStoreMove: vi.fn(),
  mockUpdateResource: vi.fn(),
}));

vi.mock('@/libs/replica', async () => ({
  ...(await vi.importActual<typeof ReplicaModule>('@/libs/replica')),
  revalidateReplica: mockRevalidateReplica,
}));

vi.mock('@/features/ResourceManager/store', () => ({
  useResourceManagerStore: {
    getState: () => ({
      setSort: mockSetSort,
      collapseHierarchySearch: mockCollapseHierarchySearch,
      patchSearchHit: mockPatchSearchHit,
    }),
  },
}));

vi.mock('@/services/knowledgeBase', () => ({
  knowledgeBaseService: { reorderKnowledgeItems: mockReorder },
}));

vi.mock('@/services/file', () => ({
  fileService: {
    getKnowledgeItems: mockGetKnowledgeItems,
  },
}));

const moveCachePatch = {
  fromParentKeys: ['folder-a'],
  scope: { libraryId: 'kb-1', workspaceId: 'workspace-1' },
  toParentKeys: ['folder-b'],
};

const fileStoreState = {
  queryParams: { libraryId: 'kb-1', parentId: null as string | null },
  resourceList: [],
  reorderCurrentResources: vi.fn(() => ({ commit: vi.fn(), rollback: vi.fn() })),
  applyMovedResourceToCaches: mockApplyMovedResourceToCaches,
  prepareResourceMoveCachePatch: vi.fn(async () => moveCachePatch),
  moveResource: mockStoreMove,
  refreshFileList: mockRefreshFileList,
  resourceMap: new Map<string, unknown>(),
};

vi.mock('@/services/resource', () => ({
  resourceService: {
    deleteResources: mockDeleteResources,
    moveResource: mockResourceMove,
    updateResource: mockUpdateResource,
  },
}));

vi.mock('@/store/file', () => ({
  useFileStore: {
    getState: () => fileStoreState,
  },
}));

const createState = (): TreeState => ({
  sorter: 'custom',
  sortType: SortType.Asc,
  setTreeSort: vi.fn(),
  reorderItems: vi.fn(),
  revalidateLoaded: vi.fn(),
  children: {},
  dropNodes: vi.fn(),
  epoch: 0,
  errors: {},
  expanded: {},
  init: vi.fn(),
  knowledgeBaseId: 'kb-1',
  loadChildren: vi.fn(),
  moveItem: vi.fn(),
  moveItems: vi.fn(),
  expandAncestors: vi.fn(),
  reconcile: vi.fn(),
  removeItems: vi.fn(),
  renameItem: vi.fn(),
  forgetLibrary: vi.fn(),
  forgetSnapshot: vi.fn(),
  reset: vi.fn(),
  preHydrate: vi.fn(),
  revalidate: vi.fn(),
  snapshotMap: {},
  snapshotReplica: createReplicaState(),
  status: {},
  toggle: vi.fn(),
});

const createSetter = (getState: () => TreeState) => {
  return (
    partial:
      Partial<TreeState> | TreeState | ((state: TreeState) => Partial<TreeState> | TreeState),
  ) => {
    const next = typeof partial === 'function' ? partial(getState()) : partial;
    Object.assign(getState(), next);
  };
};

describe('TreeActionImpl folder key resolution', () => {
  // The sidebar walks `children` by folder id, while the explorer's query
  // params carry the folder slug from the URL (`/library/<kb>/<slug>`).
  const folder = toTreeItem({
    fileType: CUSTOM_FOLDER_FILE_TYPE,
    id: 'docs_folder',
    name: '2026.08',
    slug: 'f13650aa',
  });

  const createLoadedState = (): TreeState => {
    const state = createState();
    state.children = { '': [folder] };
    return state;
  };

  beforeEach(() => {
    mockGetKnowledgeItems.mockReset();
  });

  it('revalidate drops the sidebar search depth and refreshes the replica', async () => {
    const state = createState();
    const actions = new TreeActionImpl(
      createSetter(() => state),
      () => state,
    );
    mockCollapseHierarchySearch.mockClear();
    mockRevalidateReplica.mockClear();
    mockGetKnowledgeItems.mockResolvedValue({ items: [] });

    await actions.revalidate('folder-a');

    // The sidebar's flat search list is a replica now; a rename/move/delete in
    // the tree must drop the loaded search depth (so a stale tail row cannot
    // survive) and revalidate it (so the head is fresh).
    await vi.waitFor(() => {
      expect(mockCollapseHierarchySearch).toHaveBeenCalled();
      expect(mockRevalidateReplica).toHaveBeenCalledWith(hierarchySearchResource);
    });
  });

  it('a revalidate requested during an in-flight root load runs once that load settles', async () => {
    const state = createState();
    const actions = new TreeActionImpl(
      createSetter(() => state),
      () => state,
    );
    // The initial root fetch captured its snapshot before the sidebar "+"
    // created a row; the refresh must not be dropped on the floor.
    let resolveInitial!: (value: { items: unknown[] }) => void;
    const initial = new Promise<{ items: unknown[] }>((resolve) => {
      resolveInitial = resolve;
    });
    const created = { fileType: 'custom/document', id: 'docs_created', name: 'New', slug: null };
    mockGetKnowledgeItems.mockReturnValueOnce(initial).mockResolvedValue({ items: [created] });

    const load = actions.loadChildren('');
    expect(state.status['']).toBe('loading');

    await actions.revalidate('');
    await actions.revalidate('');
    expect(mockGetKnowledgeItems).toHaveBeenCalledTimes(1);

    resolveInitial({ items: [] });
    await load;
    await vi.waitFor(() => {
      expect(state.children['']?.map((item) => item.id)).toEqual(['docs_created']);
    });
    // Both queued requests collapsed into a single follow-up fetch.
    expect(mockGetKnowledgeItems).toHaveBeenCalledTimes(2);
    expect(state.status['']).toBe('idle');
  });

  it('a revalidate requested during an in-flight revalidate follows it instead of racing it', async () => {
    const state = createState();
    const actions = new TreeActionImpl(
      createSetter(() => state),
      () => state,
    );
    let resolveFirst!: (value: { items: unknown[] }) => void;
    const first = new Promise<{ items: unknown[] }>((resolve) => {
      resolveFirst = resolve;
    });
    const fresh = { fileType: 'custom/document', id: 'docs_fresh', name: 'Fresh', slug: null };
    mockGetKnowledgeItems.mockReturnValueOnce(first).mockResolvedValue({ items: [fresh] });

    const running = actions.revalidate('folder-a');
    expect(state.status['folder-a']).toBe('revalidating');
    await actions.revalidate('folder-a');
    expect(mockGetKnowledgeItems).toHaveBeenCalledTimes(1);

    resolveFirst({ items: [] });
    await running;
    await vi.waitFor(() => {
      expect(state.children['folder-a']?.map((item) => item.id)).toEqual(['docs_fresh']);
    });
    expect(mockGetKnowledgeItems).toHaveBeenCalledTimes(2);
  });

  it('revalidate stores the refetched children under the folder id when addressed by slug', async () => {
    const state = createLoadedState();
    const actions = new TreeActionImpl(
      createSetter(() => state),
      () => state,
    );
    mockGetKnowledgeItems.mockResolvedValue({
      items: [{ fileType: 'custom/document', id: 'docs_new', name: 'Untitled', slug: null }],
    });

    await actions.revalidate('f13650aa');

    expect(state.children['docs_folder']?.map((item) => item.id)).toEqual(['docs_new']);
    expect(state.children['f13650aa']).toBeUndefined();
    expect(state.status['docs_folder']).toBe('idle');
  });
});

describe('sortTreeItems', () => {
  const doc = (id: string, name: string, createdAt?: string) =>
    toTreeItem({ createdAt, fileType: 'custom/document', id, name });

  it('puts a just-created page first instead of dropping it into the A-Z list', () => {
    // Creating a page inside a folder full of "<name> 周报 — 2026-Wxx"
    // rows landed the new "Untitled" between "TC" and "xiaojie".
    const rows = [
      doc('report-tc', 'TC 周报 — 2026-W35', '2026-08-28T02:00:00.000Z'),
      doc('untitled', 'Untitled', '2026-09-04T15:31:00.000Z'),
      doc('report-xiaojie', 'xiaojie 周报 — 2026-W35', '2026-08-29T02:00:00.000Z'),
    ];

    expect(sortTreeItems(rows, 'createdAt', SortType.Desc).map((item) => item.id)).toEqual([
      'untitled',
      'report-xiaojie',
      'report-tc',
    ]);
  });

  it('keeps folders ahead of documents no matter how new the document is', () => {
    const folderRow = toTreeItem({
      createdAt: '2026-01-01T00:00:00.000Z',
      fileType: CUSTOM_FOLDER_FILE_TYPE,
      id: 'folder-old',
      name: '2026.08',
    });
    const newest = doc('doc-new', 'Untitled', '2026-09-04T15:31:00.000Z');

    expect(sortTreeItems([newest, folderRow]).map((item) => item.id)).toEqual([
      'folder-old',
      'doc-new',
    ]);
  });

  it('sends rows without a timestamp to the tail of their group in A-Z order', () => {
    const rows = [
      doc('stub-b', 'B stub'),
      doc('dated', 'Dated', '2026-08-01T00:00:00.000Z'),
      doc('stub-a', 'A stub'),
    ];

    expect(sortTreeItems(rows, 'createdAt', SortType.Desc).map((item) => item.id)).toEqual([
      'dated',
      'stub-b',
      'stub-a',
    ]);
  });

  it('breaks a createdAt tie by name', () => {
    const rows = [
      doc('b', 'Beta', '2026-08-01T00:00:00.000Z'),
      doc('a', 'Alpha', '2026-08-01T00:00:00.000Z'),
    ];

    expect(sortTreeItems(rows, 'createdAt', SortType.Asc).map((item) => item.id)).toEqual([
      'a',
      'b',
    ]);
  });
});

describe('toTreeItemFromResource', () => {
  const row = {
    createdAt: new Date('2026-01-01T00:00:00Z'),
    fileId: 'file-1',
    fileType: 'custom/document',
    id: 'docs_1',
    metadata: { emoji: '📄' },
    name: 'Private note',
    parentId: null,
    size: 12,
    slug: 'private-note',
    sourceType: 'document',
    url: '',
    userId: 'user-1',
    visibility: 'private' as const,
  };

  it('carries the fields the sidebar and the row menu read', () => {
    // Regression: the explorer → tree reconcile rebuilt rows from a hand-written
    // literal that omitted these two, so every list refresh stripped the private
    // marker off the sidebar and mis-gated publish / make-private.
    expect(toTreeItemFromResource(row)).toMatchObject({
      userId: 'user-1',
      visibility: 'private',
    });
  });

  it('keeps a workspace-shared row shared', () => {
    expect(toTreeItemFromResource({ ...row, visibility: 'public' }).visibility).toBe('public');
  });

  it('produces the same row as the tree fetch does for the same input', () => {
    expect(toTreeItemFromResource(row)).toEqual(toTreeItem(row));
  });

  it('keeps a document with children expandable', () => {
    // Dropping `hasChildren` here would take the caret off a parent page on
    // every explorer refresh.
    const parent = toTreeItemFromResource({ ...row, hasChildren: true });

    expect(parent).toMatchObject({ hasChildren: true, isFolder: false });
    expect(isExpandable(parent)).toBe(true);
  });
});

describe('toTreeItem hasChildren', () => {
  const doc = { fileType: 'custom/document', id: 'docs_1', name: 'Page' };

  it('carries hasChildren from the server row', () => {
    expect(toTreeItem({ ...doc, hasChildren: true }).hasChildren).toBe(true);
    expect(toTreeItem({ ...doc, hasChildren: false }).hasChildren).toBe(false);
  });

  it('treats folders and documents with children as expandable, leaves as not', () => {
    expect(isExpandable(toTreeItem({ ...doc, hasChildren: true }))).toBe(true);
    expect(isExpandable(toTreeItem(doc))).toBe(false);
    expect(isExpandable(toTreeItem({ ...doc, fileType: CUSTOM_FOLDER_FILE_TYPE }))).toBe(true);
  });
});

describe('TreeActionImpl sorting and reorder', () => {
  const row = (id: string, isFolder = false) =>
    toTreeItem({
      id,
      name: id,
      fileType: isFolder ? CUSTOM_FOLDER_FILE_TYPE : 'text/plain',
    });

  beforeEach(() => {
    mockReorder.mockReset();
    mockSetSort.mockClear();
    mockRefreshFileList.mockResolvedValue(undefined);
    mockGetKnowledgeItems.mockResolvedValue({ items: [] });
    fileStoreState.queryParams = { libraryId: 'kb-1', parentId: null };
    fileStoreState.reorderCurrentResources.mockClear();
  });

  it('uses natural numbered names by default and keeps folders first in every mode', () => {
    const rows = ['10_知识', '02_知识', '09_知识', '01_知识'].map((id) => row(id));
    expect(sortTreeItems(rows).map((item) => item.id)).toEqual([
      '01_知识',
      '02_知识',
      '09_知识',
      '10_知识',
    ]);
    expect(sortTreeItems([row('第10章'), row('第2章')]).map((item) => item.id)).toEqual([
      '第2章',
      '第10章',
    ]);
    expect(sortTreeItems([row('10'), row('2')]).map((item) => item.id)).toEqual(['2', '10']);
    for (const sorter of ['custom', 'name', 'size', 'createdAt'] as const) {
      for (const direction of [SortType.Asc, SortType.Desc]) {
        expect(sortTreeItems([row('a'), row('z', true)], sorter, direction)[0].id).toBe('z');
      }
    }
  });
});
