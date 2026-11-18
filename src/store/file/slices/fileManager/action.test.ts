import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { FILE_UPLOAD_BLACKLIST, MAX_UPLOAD_FILE_COUNT } from '@/const/file';
import { createReplicaState } from '@/libs/replica';
import { mutate } from '@/libs/swr';
import { lambdaClient } from '@/libs/trpc/client';
import { fileService } from '@/services/file';
import { ragService } from '@/services/rag';
import { type FileListItem } from '@/types/files';
import { type UploadFileItem } from '@/types/files/upload';
import { unzipFile } from '@/utils/unzipFile';
import { withSWR } from '~test-utils';

import { useFileStore as useStore } from '../../store';
import * as resourceHooks from '../resource/hooks';

// Mock i18next translation function
vi.mock('i18next', () => ({
  t: (key: string, options?: any) => {
    // Return a mock translation string that includes the options for verification
    if (key === 'uploadDock.fileQueueInfo' && options?.count !== undefined) {
      return `Uploading ${options.count} files, ${options.remaining} queued`;
    }
    return key;
  },
}));

// Mock message
// Mock unzipFile
vi.mock('@/utils/unzipFile', () => ({
  unzipFile: vi.fn(),
}));

// Mock p-map to run sequentially for easier testing
vi.mock('p-map', () => ({
  default: vi.fn(async (items, mapper) => {
    return Promise.all(items.map(mapper));
  }),
}));

// Mock @/libs/swr mutate
vi.mock('@/libs/swr', async () => {
  const actual = await vi.importActual('@/libs/swr');
  return {
    ...actual,
    mutate: vi.fn(),
  };
});

// Mock lambdaClient
vi.mock('@/libs/trpc/client', () => ({
  lambdaClient: {
    file: {
      getFileItemById: { query: vi.fn() },
      getFiles: { query: vi.fn() },
      getKnowledgeItems: { query: vi.fn() },
      removeFileAsyncTask: { mutate: vi.fn() },
    },
  },
}));

const createFileBackedDocumentState = (): Pick<
  ReturnType<typeof useStore.getState>,
  'resourceMap'
> => ({
  resourceMap: new Map([
    [
      'docs_1',
      {
        createdAt: new Date(),
        fileId: 'file_1',
        fileType: 'text/plain',
        id: 'docs_1',
        name: 'Document-backed file',
        size: 1,
        sourceType: 'file',
        updatedAt: new Date(),
      },
    ],
  ]),
});

beforeEach(() => {
  vi.clearAllMocks();
  useStore.setState(
    {
      dockUploadFileList: [],
      fileDetailMap: {},
      fileDetailReplica: createReplicaState(),
      fileList: [],
      fileListMeta: undefined,
      fileListReplica: createReplicaState(),
      folderBreadcrumbMap: {},
      folderBreadcrumbReplica: createReplicaState(),
      resourceList: [],
      resourceMap: new Map(),
    },
    false,
  );
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('FileManagerActions', () => {
  describe('cancelUploads', () => {
    it('should abort matched uploads and update their status in a batch', () => {
      const { result } = renderHook(() => useStore());
      const controller1 = new AbortController();
      const controller2 = new AbortController();
      const dispatchSpy = vi.spyOn(result.current, 'dispatchDockFileList');

      act(() => {
        useStore.setState({
          dockUploadFileList: [
            {
              abortController: controller1,
              file: new File([], 'test-1.txt'),
              id: 'file-1',
              status: 'pending',
            },
            {
              abortController: controller2,
              file: new File([], 'test-2.txt'),
              id: 'file-2',
              status: 'uploading',
            },
            { file: new File([], 'test-3.txt'), id: 'file-3', status: 'success' },
          ] as UploadFileItem[],
        });
      });

      act(() => {
        result.current.cancelUploads(['file-1', 'file-2', 'file-404']);
      });

      expect(controller1.signal.aborted).toBe(true);
      expect(controller2.signal.aborted).toBe(true);
      expect(dispatchSpy).toHaveBeenCalledWith({
        ids: ['file-1', 'file-2'],
        status: 'cancelled',
        type: 'updateFileStatuses',
      });
    });
  });

  describe('retryDockUpload', () => {
    it('keeps the item in place and restarts a transient failed upload', async () => {
      const { result } = renderHook(() => useStore());
      const upload = vi.spyOn(result.current, 'uploadWithProgress').mockResolvedValue({
        id: 'persisted-file',
        url: 'https://example.com/file.png',
      });
      vi.spyOn(result.current, 'refreshFileList').mockResolvedValue();

      act(() => {
        useStore.setState({
          dockUploadFileList: [
            {
              error: 'Upload failed',
              file: new File([], 'retry.png', { type: 'image/png' }),
              id: 'upload-1',
              status: 'error',
            },
          ],
        });
      });

      await act(async () => {
        await result.current.retryDockUpload('upload-1');
      });

      expect(upload).toHaveBeenCalledTimes(1);
      expect(result.current.dockUploadFileList[0]).toEqual(
        expect.objectContaining({ error: undefined, id: 'upload-1', status: 'pending' }),
      );
    });
  });

  describe('dispatchDockFileList', () => {
    it('should update dockUploadFileList with new value', () => {
      const { result } = renderHook(() => useStore());

      act(() => {
        result.current.dispatchDockFileList({
          atStart: true,
          files: [{ file: new File([], 'test.txt'), id: 'file-1', status: 'pending' }],
          type: 'addFiles',
        });
      });

      expect(result.current.dockUploadFileList).toHaveLength(1);
      expect(result.current.dockUploadFileList[0].id).toBe('file-1');
    });

    it('should handle updateFileStatus dispatch', () => {
      const { result } = renderHook(() => useStore());

      act(() => {
        useStore.setState({
          dockUploadFileList: [
            { file: new File([], 'test.txt'), id: 'file-1', status: 'pending' },
          ] as UploadFileItem[],
        });
      });

      act(() => {
        result.current.dispatchDockFileList({
          id: 'file-1',
          status: 'success',
          type: 'updateFileStatus',
        });
      });

      expect(result.current.dockUploadFileList[0].status).toBe('success');
    });

    it('should handle updateFileStatuses dispatch', () => {
      const { result } = renderHook(() => useStore());

      act(() => {
        useStore.setState({
          dockUploadFileList: [
            { file: new File([], 'test-1.txt'), id: 'file-1', status: 'pending' },
            { file: new File([], 'test-2.txt'), id: 'file-2', status: 'uploading' },
            { file: new File([], 'test-3.txt'), id: 'file-3', status: 'success' },
          ] as UploadFileItem[],
        });
      });

      act(() => {
        result.current.dispatchDockFileList({
          ids: ['file-1', 'file-2'],
          status: 'cancelled',
          type: 'updateFileStatuses',
        });
      });

      expect(result.current.dockUploadFileList[0].status).toBe('cancelled');
      expect(result.current.dockUploadFileList[1].status).toBe('cancelled');
      expect(result.current.dockUploadFileList[2].status).toBe('success');
    });

    it('should handle removeFile dispatch', () => {
      const { result } = renderHook(() => useStore());

      act(() => {
        useStore.setState({
          dockUploadFileList: [
            { file: new File([], 'test.txt'), id: 'file-1', status: 'pending' },
          ] as UploadFileItem[],
        });
      });

      act(() => {
        result.current.dispatchDockFileList({
          id: 'file-1',
          type: 'removeFile',
        });
      });

      expect(result.current.dockUploadFileList).toHaveLength(0);
    });
  });

  describe('refreshFileList', () => {
    it('should revalidate the list replica and revalidate resources by default', async () => {
      const { result } = renderHook(() => useStore());
      const revalidateResourcesSpy = vi
        .spyOn(resourceHooks, 'revalidateResources')
        .mockResolvedValue(undefined);

      await act(async () => {
        await result.current.refreshFileList();
      });

      // The replica's revalidate fans the list entry out through the SWR driver.
      expect(mutate).toHaveBeenCalledWith(expect.any(Function));
      expect(revalidateResourcesSpy).toHaveBeenCalledTimes(1);
    });

    it('should skip resource revalidation when explicitly disabled', async () => {
      const { result } = renderHook(() => useStore());
      const revalidateResourcesSpy = vi
        .spyOn(resourceHooks, 'revalidateResources')
        .mockResolvedValue(undefined);

      await act(async () => {
        await result.current.refreshFileList({ revalidateResources: false });
      });

      expect(mutate).toHaveBeenCalledWith(expect.any(Function));
      expect(revalidateResourcesSpy).not.toHaveBeenCalled();
    });
  });

  describe('useFetchKnowledgeItem', () => {
    const mockFile: FileListItem = {
      chunkCount: null,
      chunkingError: null,
      createdAt: new Date(),
      embeddingError: null,
      fileType: 'text/plain',
      finishEmbedding: false,
      id: 'file-1',
      name: 'test.txt',
      size: 100,
      sourceType: 'file',
      updatedAt: new Date(),
      url: 'http://example.com/test.txt',
    };

    it('should not fetch when id is undefined', () => {
      const { result } = renderHook(() => useStore());

      renderHook(() => result.current.useFetchKnowledgeItem(undefined));

      expect(lambdaClient.file.getFileItemById.query).not.toHaveBeenCalled();
    });

    it('reads the fetched item from the replica view when id is provided', async () => {
      const { result } = renderHook(() => useStore());

      vi.mocked(lambdaClient.file.getFileItemById.query).mockResolvedValue(mockFile);

      const { result: itemResult } = renderHook(
        () => result.current.useFetchKnowledgeItem('file-1'),
        { wrapper: withSWR },
      );

      await waitFor(() => {
        expect(itemResult.current.data).toEqual(mockFile);
      });
      // The value is the replica view, not a value flowing out of the hook.
      expect(useStore.getState().fileDetailMap['file-1']?.file).toEqual(mockFile);
    });

    it('maps a server "not found" to undefined data instead of a permanent loading state', async () => {
      const { result } = renderHook(() => useStore());

      // `getKnowledgeItem` resolves `null` (not a throw) for a missing document id.
      vi.mocked(lambdaClient.file.getFileItemById.query).mockResolvedValue(undefined as any);

      const { result: itemResult } = renderHook(
        () => result.current.useFetchKnowledgeItem('file-missing'),
        { wrapper: withSWR },
      );

      await waitFor(() => {
        expect(itemResult.current.data).toBeUndefined();
        expect(itemResult.current.isLoading).toBe(false);
      });
      expect(useStore.getState().fileDetailMap['file-missing']).toEqual({ file: null });
    });

    it('treats a NOT_FOUND from the file endpoint as a confirmed absence, not an error', async () => {
      const { result } = renderHook(() => useStore());

      // `getFileItemById` throws NOT_FOUND for a deleted / inaccessible `file_*`.
      vi.mocked(lambdaClient.file.getFileItemById.query).mockRejectedValue(
        Object.assign(new Error('File not found'), { data: { code: 'NOT_FOUND' } }),
      );

      const { result: itemResult } = renderHook(
        () => result.current.useFetchKnowledgeItem('file-deleted'),
        { wrapper: withSWR },
      );

      await waitFor(() => {
        expect(itemResult.current.data).toBeUndefined();
        expect(itemResult.current.isLoading).toBe(false);
      });
      // Not an error state: the response folded a "not found" page value.
      expect(itemResult.current.error).toBeUndefined();
      expect(useStore.getState().fileDetailMap['file-deleted']).toEqual({ file: null });
    });
  });

});
