import { type Mock } from 'vitest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { lambdaClient } from '@/libs/trpc/client';
import { type GlobalRuntimeConfig } from '@/types/serverConfig';

import { globalService } from '../global';

global.fetch = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
});

vi.mock('@/libs/trpc/client', () => {
  return {
    lambdaClient: {
      config: {
        getGlobalConfig: { query: vi.fn() },
        getDefaultAgentConfig: { query: vi.fn() },
      },
    },
  };
});

describe('GlobalService', () => {
  describe('getLatestVersion', () => {
    it('should return the latest version when fetch is successful', async () => {
      // Arrange
      const mockVersion = '0.0.67';
      (fetch as Mock).mockResolvedValue({
        json: () => Promise.resolve({ tag_name: 'v' + mockVersion }),
        ok: true,
      });

      // Act
      const version = await globalService.getLatestVersion();

      // Assert
      expect(fetch).toHaveBeenCalledWith(
        'https://api.github.com/repos/lobehub/lobot/releases/latest',
        {
          headers: { Accept: 'application/vnd.github+json' },
        },
      );
      expect(version).toBe(mockVersion);
    });

    it('should throw if the latest release tag is missing', async () => {
      // Arrange
      (fetch as Mock).mockResolvedValue({
        json: () => Promise.resolve({}),
        ok: true,
      });

      // Act & Assert
      await expect(globalService.getLatestVersion()).rejects.toThrow(
        'Latest release tag is missing',
      );
    });

    it('should throw an error when the fetch call fails', async () => {
      // Arrange
      (fetch as Mock).mockRejectedValue(new Error('Network error'));

      // Act & Assert
      await expect(globalService.getLatestVersion()).rejects.toThrow('Network error');
    });

    it('should handle non-JSON responses gracefully', async () => {
      // Arrange
      (fetch as Mock).mockResolvedValue({
        json: () => Promise.reject(new SyntaxError('Unexpected token < in JSON at position 0')),
      });

      // Act & Assert
      await expect(globalService.getLatestVersion()).rejects.toThrow(SyntaxError);
    });
  });

  describe('ServerConfig', () => {
    it('should return the serverConfig when fetch is successful', async () => {
      // Arrange
      const mockConfig = {
        serverConfig: { enabledOAuthSSO: true },
        serverFeatureFlags: {},
      } as GlobalRuntimeConfig;
      vi.spyOn(lambdaClient.config.getGlobalConfig, 'query').mockResolvedValue(mockConfig);

      // Act
      const config = await globalService.getGlobalConfig();

      // Assert
      expect(config).toEqual(mockConfig);
    });
  });
});
