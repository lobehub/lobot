import { beforeEach, describe, expect, it, vi } from 'vitest';

import { initialState } from '@/store/file/initialState';
import { useFileStore } from '@/store/file/store';
import type { ResourceItem } from '@/types/resource';

import type { ResourceListParams, ResourceListValue } from './projection';

const {
  mockAddFilesToKnowledgeBase,
  mockCreateResource,
  mockDeleteResource,
  mockDeleteResources,
  mockGetActiveWorkspaceId,
  mockMoveResource,
  mockRemoveFilesFromKnowledgeBase,
  mockUpdateResource,
} = vi.hoisted(() => ({
  mockAddFilesToKnowledgeBase: vi.fn(),
  mockCreateResource: vi.fn(),
  mockDeleteResource: vi.fn(),
  mockDeleteResources: vi.fn(),
  mockGetActiveWorkspaceId: vi.fn(() => null as string | null),
  mockMoveResource: vi.fn(),
  mockRemoveFilesFromKnowledgeBase: vi.fn(),
  mockUpdateResource: vi.fn(),
}));

vi.mock('@/services/resource', () => ({
  resourceService: {
    createResource: mockCreateResource,
    deleteResource: mockDeleteResource,
    deleteResources: mockDeleteResources,
    moveResource: mockMoveResource,
    updateResource: mockUpdateResource,
  },
}));

vi.mock('@/services/knowledgeBase', () => ({
  knowledgeBaseService: {
    reorderKnowledgeItems: vi.fn(),
    addFilesToKnowledgeBase: mockAddFilesToKnowledgeBase,
    removeFilesFromKnowledgeBase: mockRemoveFilesFromKnowledgeBase,
  },
}));

vi.mock('@/business/client/hooks/useActiveWorkspaceId', () => ({
  getActiveWorkspaceId: () => mockGetActiveWorkspaceId(),
}));

const createResource = (overrides: Partial<ResourceItem> = {}): ResourceItem => ({
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  fileType: 'text/plain',
  id: 'resource-1',
  name: 'Resource 1',
  parentId: null,
  size: 1,
  sourceType: 'file',
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  url: 'files/resource-1.txt',
  ...overrides,
});

/**
 * Seed the replica view exactly as the lens would after a head page landed:
 * the flat fields and the entry stay in step, so the slice's engine reads the
 * same rows the selectors do.
 */
const seedList = (
  params: Partial<ResourceListParams>,
  items: ResourceItem[],
  meta: Partial<ResourceListValue> = {},
) => {
  const queryParams: ResourceListParams = {
    pageSize: 50,
    parentId: null,
    showFilesInKnowledgeBase: false,
    ...params,
  };
  const entry: ResourceListValue = {
    currentPage: 0,
    hasMore: false,
    items,
    nextCursor: null,
    pageSize: queryParams.pageSize,
    queryParams,
    total: items.length,
    ...meta,
  };

  useFileStore.setState({
    hasMore: entry.hasMore,
    isLoadingMore: false,
    offset: items.length,
    queryParams: entry.queryParams,
    resourceList: items,
    resourceListEntry: entry,
    resourceMap: new Map(items.map((item) => [item.id, item])),
    total: entry.total ?? items.length,
  });
};

const listIds = () => useFileStore.getState().resourceList.map((item) => item.id);

describe('resource actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetActiveWorkspaceId.mockReturnValue(null);
    useFileStore.setState(initialState);
  });

  it('optimistically drops deleted rows and restores them on failure', async () => {
    const rows = [createResource({ id: 'r1' }), createResource({ id: 'r2' })];
    mockDeleteResources.mockRejectedValue(new Error('nope'));

    seedList({}, rows);

    await expect(useFileStore.getState().deleteResources(['r1'])).rejects.toThrow();

    expect(listIds()).toEqual(['r1', 'r2']);

    mockDeleteResources.mockResolvedValue(undefined);
    await useFileStore.getState().deleteResources(['r1']);

    expect(listIds()).toEqual(['r2']);
  });

  it('removes rows from the list when the open view is that knowledge base', async () => {
    const rows = [createResource({ id: 'r1', knowledgeBaseId: 'kb-1' })];
    mockRemoveFilesFromKnowledgeBase.mockResolvedValue(undefined);

    seedList({ libraryId: 'kb-1' }, rows);

    await useFileStore.getState().removeResourcesFromKnowledgeBase('kb-1', ['r1']);

    expect(listIds()).toEqual([]);
    expect(mockRemoveFilesFromKnowledgeBase).toHaveBeenCalledWith('kb-1', ['r1']);
  });

  it('clears the painted rows but keeps the queried params', () => {
    seedList({ parentId: 'folder-a' }, [createResource({ id: 'r1', parentId: 'folder-a' })]);

    useFileStore.getState().clearCurrentQueryResources();

    expect(listIds()).toEqual([]);
    expect(useFileStore.getState().queryParams?.parentId).toBe('folder-a');
  });
});
