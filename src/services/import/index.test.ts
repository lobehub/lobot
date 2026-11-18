import { beforeEach, describe, expect, it, vi } from 'vitest';

import { lambdaClient } from '@/libs/trpc/client';
import { uploadService } from '@/services/upload';
import { ImportStage } from '@/types/importer';

import { importService } from './index';

// Mock dependencies
vi.mock('@/libs/trpc/client', () => ({
  lambdaClient: {
    importer: {
      importByFile: {
        mutate: vi.fn(),
      },
      importByPost: {
        mutate: vi.fn(),
      },
      importPgByPost: {
        mutate: vi.fn(),
      },
    },
  },
}));

vi.mock('@/services/upload', () => ({
  uploadService: {
    uploadDataToS3: vi.fn(),
  },
}));

vi.mock('@/store/user', () => ({
  useUserStore: {
    getState: vi.fn(() => ({
      importAppSettings: vi.fn(),
    })),
  },
}));

vi.mock('@/utils/uuid', () => ({
  uuid: () => 'mock-uuid-123',
}));

const createUploadResult = () => ({
  success: true as const,
  data: {
    path: 'import_config/mock-uuid-123.json',
    filename: 'mock-uuid-123.json',
    dirname: 'import_config',
    date: '2024-01-01',
  },
});

const createImportResult = <T extends Record<string, unknown>>(results: T) => ({
  results,
  success: true as const,
});

describe('ImportService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(Date, 'now').mockReturnValue(1000000);
    vi.spyOn(console, 'info').mockImplementation(() => {});
  });

  describe('importPgData', () => {
    describe('small dataset (< 500 items)', () => {
      it('should import PostgreSQL data via POST when total items < 500', async () => {
        const mockData = {
          data: {
            users: Array.from({ length: 100 }).fill({ id: 1, name: 'test' }),
            sessions: Array.from({ length: 200 }).fill({ id: 1, name: 'test' }),
          },
          mode: 'postgres' as const,
          schemaHash: 'hash123',
        };

        const mockResult = createImportResult({
          users: { added: 100, errors: 0, skips: 0 },
          sessions: { added: 200, errors: 0, skips: 0 },
        });

        vi.mocked(lambdaClient.importer.importPgByPost.mutate).mockResolvedValue(mockResult);

        const callbacks = {
          onStageChange: vi.fn(),
          onSuccess: vi.fn(),
        };

        await importService.importPgData(mockData as any, { callbacks });

        expect(callbacks.onStageChange).toHaveBeenCalledWith(ImportStage.Importing);
        expect(lambdaClient.importer.importPgByPost.mutate).toHaveBeenCalledWith(mockData);
        expect(callbacks.onStageChange).toHaveBeenCalledWith(ImportStage.Success);
        expect(callbacks.onSuccess).toHaveBeenCalledWith(mockResult.results, 0);
      });

      it('should handle error during PostgreSQL data import', async () => {
        const mockData = {
          data: {
            users: Array.from({ length: 100 }).fill({ id: 1, name: 'test' }),
          },
          mode: 'pglite' as const,
          schemaHash: 'hash123',
        };

        const mockError = {
          data: {
            code: 'PG_IMPORT_ERROR',
            httpStatus: 400,
            path: '/api/import/pg',
          },
          message: 'PostgreSQL import failed',
        };

        vi.mocked(lambdaClient.importer.importPgByPost.mutate).mockRejectedValue(mockError);

        const callbacks = {
          onStageChange: vi.fn(),
          onError: vi.fn(),
        };

        await importService.importPgData(mockData as any, { callbacks });

        expect(callbacks.onStageChange).toHaveBeenCalledWith(ImportStage.Error);
        expect(callbacks.onError).toHaveBeenCalledWith({
          code: 'PG_IMPORT_ERROR',
          httpStatus: 400,
          message: 'PostgreSQL import failed',
          path: '/api/import/pg',
        });
      });
    });

    describe('large dataset (>= 500 items)', () => {
      it('should upload to S3 and import via file when total items >= 500', async () => {
        const mockData = {
          data: {
            messages: Array.from({ length: 500 }).fill({ id: 1, content: 'test' }),
          },
          mode: 'postgres' as const,
          schemaHash: 'hash123',
        };

        const mockUploadResult = createUploadResult();

        const mockImportResult = createImportResult({
          messages: { added: 500, errors: 0, skips: 0 },
        });

        vi.mocked(uploadService.uploadDataToS3).mockResolvedValue(mockUploadResult as any);
        vi.mocked(lambdaClient.importer.importByFile.mutate).mockResolvedValue(mockImportResult);

        const callbacks = {
          onStageChange: vi.fn(),
          onSuccess: vi.fn(),
        };

        await importService.importPgData(mockData as any, { callbacks });

        expect(callbacks.onStageChange).toHaveBeenCalledWith(ImportStage.Uploading);
        expect(uploadService.uploadDataToS3).toHaveBeenCalledWith(
          mockData,
          expect.objectContaining({
            filename: 'mock-uuid-123.json',
            pathname: 'import_config/mock-uuid-123.json',
          }),
        );
        expect(callbacks.onStageChange).toHaveBeenCalledWith(ImportStage.Importing);
        expect(callbacks.onStageChange).toHaveBeenCalledWith(ImportStage.Success);
      });

      it('should handle multiple tables with varying sizes', async () => {
        const mockData = {
          data: {
            users: Array.from({ length: 100 }).fill({ id: 1 }),
            messages: Array.from({ length: 300 }).fill({ id: 1 }),
            sessions: Array.from({ length: 150 }).fill({ id: 1 }),
          },
          mode: 'postgres' as const,
          schemaHash: 'hash123',
        };

        const mockUploadResult = createUploadResult();

        const mockImportResult = createImportResult({
          users: { added: 100, errors: 0, skips: 0 },
          messages: { added: 300, errors: 0, skips: 0 },
          sessions: { added: 150, errors: 0, skips: 0 },
        });

        vi.mocked(uploadService.uploadDataToS3).mockResolvedValue(mockUploadResult as any);
        vi.mocked(lambdaClient.importer.importByFile.mutate).mockResolvedValue(mockImportResult);

        await importService.importPgData(mockData as any);

        expect(uploadService.uploadDataToS3).toHaveBeenCalled();
      });
    });

    describe('edge cases', () => {
      it('should work without options', async () => {
        const mockData = {
          data: {
            users: Array.from({ length: 10 }).fill({ id: 1, name: 'test' }),
          },
          mode: 'pglite' as const,
          schemaHash: 'hash123',
        };

        const mockResult = createImportResult({
          users: { added: 10, errors: 0, skips: 0 },
        });

        vi.mocked(lambdaClient.importer.importPgByPost.mutate).mockResolvedValue(mockResult);

        await expect(importService.importPgData(mockData as any)).resolves.not.toThrow();
      });

      it('should handle empty data object', async () => {
        const mockData = {
          data: {},
          mode: 'pglite' as const,
          schemaHash: 'hash123',
        };

        const mockResult = createImportResult({});

        vi.mocked(lambdaClient.importer.importPgByPost.mutate).mockResolvedValue(mockResult);

        await importService.importPgData(mockData as any);

        expect(lambdaClient.importer.importPgByPost.mutate).toHaveBeenCalledWith(mockData);
      });

      it('should calculate total length correctly across multiple tables', async () => {
        const mockData = {
          data: {
            table1: Array.from({ length: 100 }).fill({}),
            table2: Array.from({ length: 200 }).fill({}),
            table3: Array.from({ length: 199 }).fill({}),
          },
          mode: 'postgres' as const,
          schemaHash: 'hash123',
        };

        const mockResult = createImportResult({});

        vi.mocked(lambdaClient.importer.importPgByPost.mutate).mockResolvedValue(mockResult);

        await importService.importPgData(mockData as any);

        // Total is 499, should use POST
        expect(lambdaClient.importer.importPgByPost.mutate).toHaveBeenCalled();
        expect(uploadService.uploadDataToS3).not.toHaveBeenCalled();
      });
    });
  });
});
