/**
 * @vitest-environment happy-dom
 *
 * `file/slices/document` is a by-id replica of the `documents` table: one entry
 * per document id, persisted per identity scope, so the resource manager paints
 * the open page from the projection and the network only confirms it. This suite
 * drives the real sync path (SWR provider + the app's scoped mutate) instead of
 * poking the store.
 */
import { randomUUID } from 'node:crypto';

import { CUSTOM_DOCUMENT_FILE_TYPE } from '@lobechat/const';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import { createElement, useEffect } from 'react';
import { SWRConfig, useSWRConfig } from 'swr';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { cacheScope } from '@/libs/replica';
import { setScopedMutate } from '@/libs/swr/mutate';
import { documentService } from '@/services/document';
import { DocumentSourceType, type LobeDocument } from '@/types/document';

import { useFileStore } from '../../store';
import { initialDocumentState } from './initialState';
import { fileDocumentResource } from './projection';

const mocks = vi.hoisted(() => ({ activeWorkspaceId: null as string | null }));

vi.mock('@/business/client/hooks/useActiveWorkspaceId', () => ({
  getActiveWorkspaceId: () => mocks.activeWorkspaceId,
  useActiveWorkspaceId: () => mocks.activeWorkspaceId,
}));

vi.mock('@/services/document', () => ({
  documentService: {
    createDocument: vi.fn(),
    deleteDocument: vi.fn(),
    getDocumentById: vi.fn(),
    updateDocument: vi.fn(),
  },
}));

const MutateBridge = () => {
  const { mutate } = useSWRConfig();
  useEffect(() => setScopedMutate(mutate), [mutate]);
  return null;
};

const wrapper = ({ children }: PropsWithChildren) =>
  createElement(
    SWRConfig,
    { value: { dedupingInterval: 0, provider: () => new Map() } },
    createElement(MutateBridge),
    children,
  );

/** A `documents` row as the server returns it. */
const serverRow = (overrides: Record<string, unknown> = {}) =>
  ({
    content: 'Body',
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    editorData: '{}',
    fileType: CUSTOM_DOCUMENT_FILE_TYPE,
    filename: 'Old title',
    id: 'doc-1',
    metadata: {},
    parentId: null,
    slug: null,
    source: 'document',
    sourceType: DocumentSourceType.EDITOR,
    title: 'Old title',
    totalCharCount: 4,
    updatedAt: new Date('2024-01-01T00:00:00.000Z'),
    ...overrides,
  }) as any;

/** The normalized store shape the replica holds. */
const lobeDocument = (overrides: Partial<LobeDocument> = {}): LobeDocument => ({
  content: 'Body',
  createdAt: new Date('2024-01-01T00:00:00.000Z'),
  editorData: {},
  fileType: CUSTOM_DOCUMENT_FILE_TYPE,
  filename: 'Old title',
  id: 'doc-1',
  metadata: {},
  source: 'document',
  sourceType: DocumentSourceType.EDITOR,
  title: 'Old title',
  totalCharCount: 4,
  totalLineCount: 0,
  updatedAt: new Date('2024-01-01T00:00:00.000Z'),
  ...overrides,
});

/** Never-resolving fetch: the first frame can only come from storage. */
const pending = <T>() => new Promise<T>(() => {});

const storedRow = (documentId: string, scope: string) =>
  fileDocumentResource.storage!.get({ queryKey: documentId, scope });

describe('file document replica', () => {
  const scopes = new Set<string>();
  let scope = '';

  const useScope = (next: string) => {
    scope = next;
    scopes.add(next);
    vi.spyOn(cacheScope, 'get').mockImplementation(() => scope);
    vi.spyOn(cacheScope, 'use').mockImplementation(() => scope);
    vi.spyOn(cacheScope, 'canPersist').mockReturnValue(true);
  };

  /** Render `useFetchDocumentDetail` the way the resource manager calls it. */
  const renderDetail = (documentId: string | undefined) =>
    renderHook(
      () => {
        const useFetchDocumentDetail = useFileStore((s) => s.useFetchDocumentDetail);

        return useFetchDocumentDetail(documentId);
      },
      { wrapper },
    );

  beforeEach(() => {
    mocks.activeWorkspaceId = null;
    useScope(`file-user-${randomUUID()}:personal`);
    act(() =>
      useFileStore.setState(
        {
          ...initialDocumentState,
          queryParams: undefined,
          resourceList: [],
          resourceMap: new Map(),
        },
        false,
      ),
    );
    vi.mocked(documentService.createDocument).mockReset();
    vi.mocked(documentService.deleteDocument).mockReset();
    vi.mocked(documentService.getDocumentById).mockReset();
    vi.mocked(documentService.updateDocument).mockReset();
  });

  afterEach(async () => {
    await Promise.all(
      [...scopes].map((value) =>
        Promise.all(
          ['doc-1', 'doc-2', 'folder-1'].map((id) =>
            fileDocumentResource.storage!.remove({ queryKey: id, scope: value }),
          ),
        ),
      ),
    );
    scopes.clear();
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  describe('by-id detail', () => {
    it('paints the persisted row on the first frame, before the network answers', async () => {
      const cached = lobeDocument({ content: '# Cached', title: 'Cached' });
      await fileDocumentResource.storage!.set(
        { queryKey: 'doc-1', scope },
        { data: { document: cached }, updatedAt: 1 },
      );
      vi.mocked(documentService.getDocumentById).mockImplementation(() => pending());

      const { result } = renderDetail('doc-1');

      await waitFor(() =>
        expect(useFileStore.getState().documentMap['doc-1']).toEqual({ document: cached }),
      );
      expect(result.current.data).toEqual(cached);
      expect(result.current.isLoading).toBe(false);
      // The network request is still in flight; the frame did not wait for it.
      expect(result.current.isValidating).toBe(true);
    });

    it('adopts the server row and persists the projection', async () => {
      vi.mocked(documentService.getDocumentById).mockResolvedValue(
        serverRow({ content: '# Server', title: 'Server title' }) as any,
      );

      const { result } = renderDetail('doc-1');

      await waitFor(() =>
        expect(useFileStore.getState().documentMap['doc-1']?.document?.content).toBe('# Server'),
      );
      expect(result.current.data?.title).toBe('Server title');
      await waitFor(async () => {
        const stored = await storedRow('doc-1', scope);
        expect(stored?.data.document?.content).toBe('# Server');
      });
    });

    it('resolves a missing document to not found and never persists the marker', async () => {
      vi.mocked(documentService.getDocumentById).mockResolvedValue(undefined as any);

      const { result } = renderDetail('doc-1');

      await waitFor(() =>
        expect(useFileStore.getState().documentMap['doc-1']).toEqual({ document: null }),
      );
      expect(result.current.data).toBeNull();
      expect(await storedRow('doc-1', scope)).toBeUndefined();
    });

    it('drops the persisted row when a previously cached document turns out to be gone', async () => {
      const cached = lobeDocument({ content: '# Cached', title: 'Cached' });
      await fileDocumentResource.storage!.set(
        { queryKey: 'doc-1', scope },
        { data: { document: cached }, updatedAt: 1 },
      );
      // The document was deleted / access revoked on another device: the server
      // now answers not found for it.
      vi.mocked(documentService.getDocumentById).mockResolvedValue(undefined as any);

      const { result } = renderDetail('doc-1');

      await waitFor(() =>
        expect(useFileStore.getState().documentMap['doc-1']).toEqual({ document: null }),
      );
      expect(result.current.data).toBeNull();
      // The stale projection must be gone, so a later reload cannot hydrate and
      // briefly paint a document the server no longer has.
      await waitFor(async () => {
        expect(await storedRow('doc-1', scope)).toBeUndefined();
      });
    });

    it('drops the cached row when access to the document was revoked (FORBIDDEN)', async () => {
      const cached = lobeDocument({ content: '# Now private', title: 'Cached' });
      await fileDocumentResource.storage!.set(
        { queryKey: 'doc-1', scope },
        { data: { document: cached }, updatedAt: 1 },
      );
      vi.mocked(documentService.getDocumentById).mockRejectedValue(
        Object.assign(new Error('forbidden'), { data: { code: 'FORBIDDEN' } }) as any,
      );

      const { result } = renderDetail('doc-1');

      await waitFor(() => expect(result.current.error).toBeDefined());
      await waitFor(() =>
        expect(useFileStore.getState().documentMap['doc-1']).toEqual({ document: null }),
      );
      await waitFor(async () => {
        expect(await storedRow('doc-1', scope)).toBeUndefined();
      });
    });

    it('loads the document on retry once access is granted again', async () => {
      vi.mocked(documentService.getDocumentById).mockRejectedValue(
        Object.assign(new Error('forbidden'), { data: { code: 'FORBIDDEN' } }) as any,
      );
      const { result } = renderDetail('doc-1');
      await waitFor(() => expect(result.current.error).toBeDefined());

      vi.mocked(documentService.getDocumentById).mockResolvedValue(
        serverRow({ content: '# Shared', title: 'Shared' }) as any,
      );
      await act(async () => {
        await result.current.mutate();
      });

      await waitFor(() => expect(result.current.data?.content).toBe('# Shared'));
      expect(result.current.error).toBeUndefined();
    });

    it('drops the previous identity’s rows before the next one paints', async () => {
      vi.mocked(documentService.getDocumentById).mockResolvedValue(serverRow() as any);

      const sync = renderDetail('doc-1');
      await waitFor(() => expect(useFileStore.getState().documentMap['doc-1']).toBeDefined());

      vi.mocked(documentService.getDocumentById).mockImplementation(() => pending());
      useScope(`file-user-${randomUUID()}:personal`);
      sync.rerender();

      await waitFor(() => expect(useFileStore.getState().documentMap['doc-1']).toBeUndefined());
    });
  });
});
