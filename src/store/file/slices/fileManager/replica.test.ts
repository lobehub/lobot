/**
 * @vitest-environment happy-dom
 *
 * The file manager's knowledge-item list and by-id detail are
 * `local-replica` resources: the persisted head page / detail paints before
 * the network answers, the response confirms and persists it, "load more"
 * appends through the engine, and — because the two resources are linked — a
 * rename or delete reaches the list row and every loaded detail entry at once.
 */
import { randomUUID } from 'node:crypto';

import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import { createElement, useEffect } from 'react';
import { SWRConfig, useSWRConfig } from 'swr';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { cacheScope } from '@/libs/replica';
import { setScopedMutate } from '@/libs/swr/mutate';
import { lambdaClient } from '@/libs/trpc/client';
import { type FileListItem } from '@/types/files';

import { useFileStore } from '../../store';
import { fileDetailResource, type FileListParams, fileListResource } from './projection';

vi.mock('@/libs/trpc/client', () => ({
  lambdaClient: {
    document: { updateDocument: { mutate: vi.fn() } },
    file: {
      getFileItemById: { query: vi.fn() },
      getKnowledgeItems: { query: vi.fn() },
      publishFileToWorkspace: { mutate: vi.fn() },
      removeFile: { mutate: vi.fn() },
      removeFiles: { mutate: vi.fn() },
      setFileVisibility: { mutate: vi.fn() },
      updateFile: { mutate: vi.fn() },
    },
  },
}));

const BASE_PARAMS: FileListParams = { category: 'all', pageSize: 50 };
const BASE_KEY = fileListResource.storageKey(BASE_PARAMS);

const file = (id: string, name = id): FileListItem =>
  ({
    chunkCount: null,
    chunkingError: null,
    createdAt: new Date(0),
    embeddingError: null,
    fileType: 'text/plain',
    finishEmbedding: false,
    id,
    name,
    size: 1,
    sourceType: 'file',
    updatedAt: new Date(0),
    url: `https://example.com/${id}`,
  }) as FileListItem;

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

describe('fileManager replicas', () => {
  const scopes = new Set<string>();
  let scope = '';

  const useScope = (next: string) => {
    scope = next;
    scopes.add(next);
    vi.spyOn(cacheScope, 'get').mockImplementation(() => scope);
    vi.spyOn(cacheScope, 'use').mockImplementation(() => scope);
    vi.spyOn(cacheScope, 'canPersist').mockReturnValue(true);
  };

  beforeEach(() => {
    useScope(`file-user-${randomUUID()}:personal`);
    act(() =>
      useFileStore.setState({
        dockUploadFileList: [],
        fileDetailMap: {},
        fileList: [],
        fileListMeta: undefined,
      }),
    );
  });

  afterEach(async () => {
    cleanup();
    await Promise.all(
      [...scopes].flatMap((value) => [
        fileListResource.storage!.remove({ queryKey: BASE_KEY, scope: value }),
        fileDetailResource.storage!.remove({ queryKey: 'file-1', scope: value }),
      ]),
    );
    scopes.clear();
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  describe('confirmed missing detail', () => {
    it('drops the persisted projection on NOT_FOUND so a reload cannot paint the stale file', async () => {
      // A previous visit persisted this file's detail.
      await fileDetailResource.storage!.set(
        { queryKey: 'file-1', scope },
        { data: { file: file('file-1', 'Stale') }, updatedAt: 1 },
      );
      // The server now answers NOT_FOUND (deleted or inaccessible).
      vi.mocked(lambdaClient.file.getFileItemById.query).mockRejectedValue(
        Object.assign(new Error('File not found'), { data: { code: 'NOT_FOUND' } }),
      );

      const { result } = renderHook(() => useFileStore((s) => s.useFetchKnowledgeItem)('file-1'), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.data).toBeUndefined();
        expect(result.current.isLoading).toBe(false);
      });
      // The view carries the confirmed absence…
      expect(useFileStore.getState().fileDetailMap['file-1']).toEqual({ file: null });
      // …and the stale persisted projection is gone: a reload hydrates nothing.
      await waitFor(async () => {
        expect(
          await fileDetailResource.storage!.get({ queryKey: 'file-1', scope }),
        ).toBeUndefined();
      });
    });
  });
});
