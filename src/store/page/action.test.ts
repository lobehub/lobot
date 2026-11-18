import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DocumentSourceType } from '@/types/document';
import type { DocumentItem } from '@/types/serverData';

import { pageActions } from './action';
import { PAGE_LIST_KEY, TEMP_PAGE_ID_PREFIX } from './projection';
import { usePageStore } from './store';

vi.mock('@/libs/swr', () => ({
  mutate: vi.fn(),
  useClientDataSWR: vi.fn(() => ({ isValidating: false, mutate: vi.fn() })),
}));

vi.mock('@/services/document', () => ({
  documentService: {
    createDocument: vi.fn(),
    deleteDocument: vi.fn(),
    getDocumentById: vi.fn(),
    updateDocument: vi.fn(),
  },
}));

vi.mock('@/store/home', () => ({
  useHomeStore: {
    getState: () => ({ refreshDocsHome: vi.fn().mockResolvedValue(undefined) }),
  },
}));

const { documentService } = await import('@/services/document');

/** A `documents` row as the server returns it. */
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

const items = () => usePageStore.getState().pageListMap[PAGE_LIST_KEY]?.items ?? [];

beforeEach(() => {
  vi.clearAllMocks();
  pageActions.reset();
});

afterEach(async () => {
  // Page mutations refresh Docs home through a fire-and-forget dynamic import.
  await vi.dynamicImportSettled();
});

describe('pageActions — createNewPage', () => {
  it('shows an optimistic row, then swaps in the server row and navigates to it', async () => {
    const navigate = vi.fn();
    usePageStore.setState({ navigate });
    vi.mocked(documentService.createDocument).mockResolvedValue(
      row('docnew1', { title: 'My page', visibility: 'private' }),
    );

    const id = await pageActions.createNewPage('My page', 'private');

    expect(id).toBe('docnew1');
    // The optimistic row (client-minted id) is gone, the real row is in place.
    expect(items().map((doc) => doc.id)).toEqual(['docnew1']);
    expect(items()[0].visibility).toBe('private');
    expect(items()[0].title).toBe('My page');
    expect(usePageStore.getState().selectedPageId).toBe('docnew1');
    expect(usePageStore.getState().isCreatingNew).toBe(false);
    expect(navigate).toHaveBeenCalledWith('/resource/page/docnew1');
  });

  it('shows the optimistic row while the request is in flight', async () => {
    let resolve!: (value: DocumentItem) => void;
    vi.mocked(documentService.createDocument).mockReturnValue(
      new Promise<DocumentItem>((r) => {
        resolve = r;
      }),
    );

    const pending = pageActions.createNewPage('Pending page');
    // Yield so the optimistic dispatch has run.
    await Promise.resolve();

    expect(items()).toHaveLength(1);
    expect(items()[0].id.startsWith(TEMP_PAGE_ID_PREFIX)).toBe(true);
    expect(items()[0].title).toBe('Pending page');
    expect(usePageStore.getState().isCreatingNew).toBe(true);

    resolve(row('docreal1'));
    await pending;

    expect(items().map((doc) => doc.id)).toEqual(['docreal1']);
  });

  it('drops the optimistic row and rethrows when creation fails', async () => {
    const navigate = vi.fn();
    usePageStore.setState({ navigate });
    vi.mocked(documentService.createDocument).mockRejectedValue(new Error('boom'));

    await expect(pageActions.createNewPage('My page')).rejects.toThrow('boom');

    expect(items()).toEqual([]);
    expect(usePageStore.getState().selectedPageId).toBeNull();
    expect(usePageStore.getState().isCreatingNew).toBe(false);
    expect(navigate).toHaveBeenCalledWith('/resource');
  });
});
