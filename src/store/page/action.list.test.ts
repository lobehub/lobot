import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DocumentSourceType, type LobeDocument } from '@/types/document';
import type { DocumentItem } from '@/types/serverData';

import { pageActions } from './action';
import { PAGE_LIST_KEY } from './projection';
import { usePageStore } from './store';

const refreshDocsHome = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));

vi.mock('@/store/home', () => ({
  useHomeStore: { getState: () => ({ refreshDocsHome }) },
}));

vi.mock('@/libs/swr', () => ({
  mutate: vi.fn(),
  useClientDataSWR: vi.fn(() => ({ isValidating: false, mutate: vi.fn() })),
}));

vi.mock('@/services/document', () => ({
  documentService: {
    getDocumentById: vi.fn(),
    publishDocumentToWorkspace: vi.fn(),
    queryDocuments: vi.fn(),
    setDocumentVisibility: vi.fn(),
  },
}));

const row = (id: string, overrides: Partial<DocumentItem> = {}): DocumentItem =>
  ({
    content: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    editorData: null,
    fileType: 'custom/document',
    filename: `${id}.md`,
    id,
    metadata: {},
    parentId: null,
    source: 'document',
    sourceType: DocumentSourceType.API,
    title: id,
    totalCharCount: 0,
    totalLineCount: 0,
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    userId: 'user-1',
    visibility: 'public',
    workspaceId: null,
    ...overrides,
  }) as unknown as DocumentItem;

const lobeDoc = (id: string, overrides: Partial<LobeDocument> = {}): LobeDocument => ({
  content: null,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  editorData: null,
  fileType: 'custom/document',
  filename: id,
  id,
  metadata: {},
  source: 'document',
  sourceType: DocumentSourceType.API,
  title: id,
  totalCharCount: 0,
  totalLineCount: 0,
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  visibility: 'public',
  workspaceId: null,
  ...overrides,
});

const list = () => usePageStore.getState().pageListMap[PAGE_LIST_KEY];

beforeEach(() => {
  vi.clearAllMocks();
  pageActions.reset();
});

afterEach(async () => {
  // Refreshing the list also schedules a Docs home refresh through a dynamic import.
  await vi.dynamicImportSettled();
});

describe('pageActions — upsertDocument', () => {
  it('mirrors a page document into the by-id projection and the loaded row', () => {
    usePageStore.setState({
      pageListMap: {
        [PAGE_LIST_KEY]: {
          currentPage: 0,
          hasMore: false,
          items: [lobeDoc('docs_a', { title: 'Old title' })],
          pageSize: 20,
          total: 1,
        },
      },
    });

    pageActions.upsertDocument(row('docs_a', { title: 'New title' }));

    expect(usePageStore.getState().pageDetailMap['docs_a'].title).toBe('New title');
    expect(list()?.items[0].title).toBe('New title');
  });

  it('mirrors a page the list does not hold into the by-id projection only', () => {
    usePageStore.setState({
      pageListMap: {
        [PAGE_LIST_KEY]: {
          currentPage: 0,
          hasMore: false,
          items: [],
          pageSize: 20,
          total: 0,
        },
      },
    });

    pageActions.upsertDocument(row('deep_link'));

    expect(usePageStore.getState().pageDetailMap['deep_link'].id).toBe('deep_link');
    expect(list()?.items).toEqual([]);
  });
});
