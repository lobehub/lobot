import { beforeEach, describe, expect, it, vi } from 'vitest';

import { initialState as fileInitialState } from '@/store/file/initialState';
import { useFileStore } from '@/store/file/store';
import { SortType } from '@/types/files';
import type { ResourceItem } from '@/types/resource';

import { useResourceManagerStore } from '.';
import { initialState } from './initialState';
import { explorerSearchResource } from './projection';

const {
  mockDeleteResourcesByQuery,
  mockDropNodes,
  mockForgetSnapshot,
  mockResolveSelectionIds,
  mockRevalidateLoaded,
} = vi.hoisted(() => ({
  mockDeleteResourcesByQuery: vi.fn(),
  mockDropNodes: vi.fn(async () => undefined),
  mockForgetSnapshot: vi.fn(),
  mockResolveSelectionIds: vi.fn(),
  mockRevalidateLoaded: vi.fn(async () => undefined),
}));

vi.mock('@/store/tree', () => ({
  useTreeStore: {
    getState: () => ({
      dropNodes: mockDropNodes,
      forgetSnapshot: mockForgetSnapshot,
      revalidateLoaded: mockRevalidateLoaded,
    }),
  },
}));

vi.mock('@/services/resource', () => ({
  resourceService: {
    deleteResourcesByQuery: mockDeleteResourcesByQuery,
    resolveSelectionIds: mockResolveSelectionIds,
  },
}));

describe('resource manager store actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    useResourceManagerStore.setState(initialState);
    useFileStore.setState(fileInitialState);
  });

  it('should default workspace resources to workspace mode when no preference is persisted', () => {
    useResourceManagerStore.setState({
      listVisibility: 'private',
      selectAllState: 'loaded',
      selectedFileIds: ['file-1'],
    });

    useResourceManagerStore.getState().hydrateListVisibility('workspace-1');

    expect(useResourceManagerStore.getState()).toMatchObject({
      listVisibility: 'workspace',
      selectAllState: 'none',
      selectedFileIds: [],
    });
  });

  it('should restore the persisted private mode over the workspace default', () => {
    useResourceManagerStore.getState().setListVisibility('private', 'workspace-1');
    useResourceManagerStore.setState({ listVisibility: 'workspace' });

    useResourceManagerStore.getState().hydrateListVisibility('workspace-1');

    expect(useResourceManagerStore.getState().listVisibility).toBe('private');
  });

  it('should drop the previous source rows when the source filter changes', () => {
    // Regression: the pick used to update ResourceManager state only, leaving
    // the previous source's rows on screen and interactive until the fetch
    // landed — and a "select all" fired in that window resolved against the
    // stale queryParams, so the next batch action targeted the wrong source.
    useFileStore.setState({
      queryParams: { category: 'images', sourceFilter: 'generated' } as any,
      resourceList: [{ id: 'file-1' }, { id: 'file-2' }] as any,
      resourceMap: new Map([['file-1', { id: 'file-1' } as any]]),
      selectAllState: 'all',
    } as any);
    useResourceManagerStore.setState({
      selectAllState: 'all',
      selectedFileIds: ['file-9'],
      selectionTotal: 12,
      sourceFilter: 'generated' as any,
    });

    useResourceManagerStore.getState().setSourceFilter('uploaded' as any);

    expect(useResourceManagerStore.getState()).toMatchObject({
      selectAllState: 'none',
      selectedFileIds: [],
      sourceFilter: 'uploaded',
    });
    expect(useResourceManagerStore.getState().selectionTotal).toBeUndefined();
    expect(useFileStore.getState().resourceList).toEqual([]);
  });

  it('should ignore re-picking the already active source filter', () => {
    useFileStore.setState({ resourceList: [{ id: 'file-1' }] as any } as any);
    useResourceManagerStore.setState({ sourceFilter: 'uploaded' as any });

    useResourceManagerStore.getState().setSourceFilter('uploaded' as any);

    // No clear, so clicking the active chip does not flash the list.
    expect(useFileStore.getState().resourceList).toEqual([{ id: 'file-1' }]);
  });

  it('should store the role-scoped total when selecting every query result', async () => {
    useFileStore.setState({ queryParams: { q: 'report' } as any });
    mockResolveSelectionIds.mockResolvedValue({ ids: ['file-1', 'file-2'], total: 2 });

    await useResourceManagerStore.getState().selectAllResources();

    expect(mockResolveSelectionIds).toHaveBeenCalledWith({ q: 'report' });
    expect(useResourceManagerStore.getState()).toMatchObject({
      selectAllState: 'all',
      selectedFileIds: [],
      selectionTotal: 2,
    });
  });

  // Regression: the explorer's own list is optimistic, but the sidebar tree
  // keeps a separate per-folder cache that the bulk delete never touched, so
  // deleted rows stayed in the sidebar until a full reload.

  // Regression: the explorer's search overlay mirrors cached replica pages, so
  // a deleted hit kept showing there (and came back after a reload) until the
  // row was dropped from the cache as part of the delete.

  // Regression: removing search hits from the library only refreshed the
  // folder list, so the removed rows and the old count stayed in the library's
  // search results.

  // Regression: while the search overlay was up, "select all" and the batch
  // delete resolved against the folder list behind it, so they acted on rows
  // the user had never seen instead of the search hits.
  describe('while the search overlay is up', () => {
    beforeEach(() => {
      useResourceManagerStore.setState({
        searchQuery: 'report',
        sorter: 'custom',
        sortType: SortType.Desc,
      });
      useFileStore.setState({ queryParams: { parentId: 'folder-a' } as any });
    });

    it('should select every search hit, not the folder list', async () => {
      mockResolveSelectionIds.mockResolvedValue({ ids: ['hit-1', 'hit-2'], total: 2 });

      await useResourceManagerStore.getState().selectAllResources();

      const query = mockResolveSelectionIds.mock.calls[0][0];
      expect(query).toMatchObject({
        filesOnly: true,
        q: 'report',
        sorter: 'custom',
        sortType: SortType.Desc,
      });
      expect(query).not.toHaveProperty('parentId');
      expect(useResourceManagerStore.getState().selectionTotal).toBe(2);
    });

  });
});

describe('library sidebar search', () => {
  beforeEach(() => {
    useResourceManagerStore.setState(initialState);
  });

  it('should store the sidebar search query', () => {
    useResourceManagerStore.getState().setLibrarySearchQuery('weekly');

    expect(useResourceManagerStore.getState().librarySearchQuery).toBe('weekly');
  });

  it('should reset the sidebar search query when switching library', () => {
    useResourceManagerStore.setState({ libraryId: 'kb-1', librarySearchQuery: 'weekly' });

    useResourceManagerStore.getState().setLibraryId('kb-2');

    expect(useResourceManagerStore.getState()).toMatchObject({
      libraryId: 'kb-2',
      librarySearchQuery: '',
    });
  });

  it('should keep the sidebar search query when the same library is re-synced from the URL', () => {
    useResourceManagerStore.setState({ libraryId: 'kb-1', librarySearchQuery: 'weekly' });

    useResourceManagerStore.getState().setLibraryId('kb-1');

    expect(useResourceManagerStore.getState().librarySearchQuery).toBe('weekly');
  });
});

describe('pending tree rename', () => {
  beforeEach(() => {
    useResourceManagerStore.setState(initialState);
  });

  it('should set and clear the pending tree rename item id', () => {
    useResourceManagerStore.getState().setPendingTreeRenameItemId('folder-1');
    expect(useResourceManagerStore.getState().pendingTreeRenameItemId).toBe('folder-1');

    useResourceManagerStore.getState().setPendingTreeRenameItemId(null);
    expect(useResourceManagerStore.getState().pendingTreeRenameItemId).toBeNull();
  });
});
