import { afterEach, describe, expect, it, vi } from 'vitest';

import { localFileKeys } from '@/libs/swr/keys';
import { isTerminalLocalFileError } from '@/services/electron/localFileService';

import { projectFileService, refreshProjectFiles } from './projectFile';

const mockDeviceClient = vi.hoisted(() => ({
  copyAssetForPublish: { mutate: vi.fn() },
  copyProjectFiles: { mutate: vi.fn() },
  createProjectDirectory: { mutate: vi.fn() },
  createProjectFile: { mutate: vi.fn() },
  moveProjectFiles: { mutate: vi.fn() },
  renameProjectFile: { mutate: vi.fn() },
  trashProjectFiles: { mutate: vi.fn() },
  getLocalFilePreview: { query: vi.fn() },
  getProjectFileIndex: { query: vi.fn() },
  readExternalAssetForPublish: { query: vi.fn() },
  searchProjectFiles: { query: vi.fn() },
}));

const mockSandboxStorageService = vi.hoisted(() => ({
  getStorage: vi.fn(),
  listFiles: vi.fn(),
}));

const mockLocalFileService = vi.hoisted(() => ({
  copyAssetForPublish: vi.fn(),
  copyLocalFiles: vi.fn(),
  createLocalDirectory: vi.fn(),
  createLocalFile: vi.fn(),
  moveLocalFiles: vi.fn(),
  renameLocalFile: vi.fn(),
  trashLocalFiles: vi.fn(),
  getLocalFilePreview: vi.fn(),
  getProjectFileIndex: vi.fn(),
  readExternalAssetForPublish: vi.fn(),
  searchProjectFiles: vi.fn(),
}));

const mockMutate = vi.hoisted(() => vi.fn());

vi.mock('@/libs/swr', () => ({
  mutate: mockMutate,
}));

vi.mock('@lobechat/const', async (importOriginal) => ({
  ...((await importOriginal()) as Record<string, unknown>),
  isDesktop: true,
}));

vi.mock('@/libs/trpc/client', () => ({
  lambdaClient: {
    device: mockDeviceClient,
  },
}));

vi.mock('@/services/electron/localFileService', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  localFileService: mockLocalFileService,
}));

vi.mock('@/services/sandboxStorage', () => ({
  sandboxStorageService: mockSandboxStorageService,
}));

describe('projectFileService', () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  it('keeps a remote device’s terminal failure code (deleted / denied file)', async () => {
    mockDeviceClient.getLocalFilePreview.query.mockResolvedValue({
      code: 'not_found',
      error: 'ENOENT: no such file or directory',
      success: false,
    });

    const error = await projectFileService
      .getLocalFilePreview({
        deviceId: 'device-1',
        path: '/repo/gone.md',
        workingDirectory: '/repo',
      })
      .catch((reason: unknown) => reason);
    expect(isTerminalLocalFileError(error)).toBe(true);

    // A gateway / disconnect failure carries no code and stays transient.
    mockDeviceClient.getLocalFilePreview.query.mockResolvedValue({
      error: 'Device offline',
      success: false,
    });
    const transient = await projectFileService
      .getLocalFilePreview({ deviceId: 'device-1', path: '/repo/a.md', workingDirectory: '/repo' })
      .catch((reason: unknown) => reason);
    expect(isTerminalLocalFileError(transient)).toBe(false);
  });

  it('gets remote local-file preview through device RPC', async () => {
    mockDeviceClient.getLocalFilePreview.query.mockResolvedValue({
      preview: {
        content: '<h1>Remote</h1>',
        contentType: 'text/html',
        type: 'text',
      },
      success: true,
    });

    const preview = await projectFileService.getLocalFilePreview({
      deviceId: 'device-1',
      path: '/repo/index.html',
      workingDirectory: '/repo',
    });

    expect(mockDeviceClient.getLocalFilePreview.query).toHaveBeenCalledWith({
      accept: undefined,
      deviceId: 'device-1',
      path: '/repo/index.html',
      workingDirectory: '/repo',
    });
    expect(mockLocalFileService.getLocalFilePreview).not.toHaveBeenCalled();
    expect(preview).toEqual({
      content: '<h1>Remote</h1>',
      contentType: 'text/html',
      type: 'text',
    });
  });

  it('maps a content-less remote video preview to the binary placeholder', async () => {
    mockDeviceClient.getLocalFilePreview.query.mockResolvedValue({
      preview: { contentType: 'video/mp4', type: 'video' },
      success: true,
    });

    const preview = await projectFileService.getLocalFilePreview({
      deviceId: 'device-1',
      path: '/repo/demo.mp4',
      workingDirectory: '/repo',
    });

    expect(preview).toEqual({ contentType: 'video/mp4', type: 'binary' });
  });

  it('forwards image-only preview constraints to remote device RPC', async () => {
    mockDeviceClient.getLocalFilePreview.query.mockResolvedValue({
      preview: {
        base64: 'aW1hZ2U=',
        contentType: 'image/png',
        type: 'image',
      },
      success: true,
    });

    await projectFileService.getLocalFilePreview({
      accept: 'image',
      deviceId: 'device-1',
      path: '/repo/image.png',
      workingDirectory: '/repo',
    });

    expect(mockDeviceClient.getLocalFilePreview.query).toHaveBeenCalledWith({
      accept: 'image',
      deviceId: 'device-1',
      path: '/repo/image.png',
      workingDirectory: '/repo',
    });
    expect(mockLocalFileService.getLocalFilePreview).not.toHaveBeenCalled();
  });

  it('rejects non-image remote payloads for image-only previews', async () => {
    mockDeviceClient.getLocalFilePreview.query.mockResolvedValue({
      preview: {
        content: 'SECRET=value',
        contentType: 'text/plain',
        type: 'text',
      },
      success: true,
    });

    await expect(
      projectFileService.getLocalFilePreview({
        accept: 'image',
        deviceId: 'device-1',
        path: '/repo/.env',
        workingDirectory: '/repo',
      }),
    ).rejects.toThrow('Unsupported local file preview type');
  });

  it('delegates desktop local-file preview to localFileService', async () => {
    mockLocalFileService.getLocalFilePreview.mockResolvedValue({
      content: '<h1>Local</h1>',
      contentType: 'text/html',
      type: 'text',
    });

    const preview = await projectFileService.getLocalFilePreview({
      path: '/repo/index.html',
      workingDirectory: '/repo',
    });

    expect(mockLocalFileService.getLocalFilePreview).toHaveBeenCalledWith({
      path: '/repo/index.html',
      workingDirectory: '/repo',
    });
    expect(mockDeviceClient.getLocalFilePreview.query).not.toHaveBeenCalled();
    expect(preview).toEqual({
      content: '<h1>Local</h1>',
      contentType: 'text/html',
      type: 'text',
    });
  });

  it('searches remote project files through device RPC', async () => {
    mockDeviceClient.searchProjectFiles.query.mockResolvedValue({
      entries: [],
      root: '/repo',
      searchedAt: '2026-07-01T00:00:00.000Z',
      source: 'git',
    });

    await projectFileService.searchProjectFiles({
      deviceId: 'device-1',
      limit: 20,
      query: 'button',
      scope: '/repo',
    });

    expect(mockDeviceClient.searchProjectFiles.query).toHaveBeenCalledWith({
      deviceId: 'device-1',
      excludeIgnored: undefined,
      changedOnly: undefined,
      limit: 20,
      query: 'button',
      scope: '/repo',
    });
    expect(mockLocalFileService.searchProjectFiles).not.toHaveBeenCalled();
  });

  it('searches local project files through localFileService', async () => {
    mockLocalFileService.searchProjectFiles.mockResolvedValue({
      entries: [],
      root: '/repo',
      searchedAt: '2026-07-01T00:00:00.000Z',
      source: 'git',
    });

    await projectFileService.searchProjectFiles({
      limit: 20,
      query: 'button',
      scope: '/repo',
    });

    expect(mockLocalFileService.searchProjectFiles).toHaveBeenCalledWith({
      excludeIgnored: undefined,
      changedOnly: undefined,
      limit: 20,
      query: 'button',
      scope: '/repo',
    });
    expect(mockDeviceClient.searchProjectFiles.query).not.toHaveBeenCalled();
  });

  describe('file tree mutations', () => {
    const REMOTE = { deviceId: 'device-1', workingDirectory: '/repo' };
    const LOCAL = { workingDirectory: '/repo' };

    it('refreshProjectFiles revalidates the file index and the git overlay', async () => {
      await refreshProjectFiles('device-1', '/repo');
      await refreshProjectFiles(undefined, '/repo');

      expect(mockMutate.mock.calls.map(([key]) => key)).toEqual([
        localFileKeys.projectIndex('device-1', '/repo'),
        localFileKeys.gitWorkingTreeFiles('device-1', '/repo'),
        localFileKeys.projectIndex(undefined, '/repo'),
        localFileKeys.gitWorkingTreeFiles(undefined, '/repo'),
      ]);
      expect(mockMutate.mock.calls[0][0]).toEqual(['localFile:projectIndex', 'device-1', '/repo']);
      expect(mockMutate.mock.calls[3][0]).toEqual([
        'localFile:gitWorkingTreeFiles',
        'local',
        '/repo',
      ]);
    });
  });

  it('marks sandbox directories with a trailing slash so the tree can nest them', async () => {
    const { projectFileService } = await import('./projectFile');

    mockSandboxStorageService.getStorage.mockResolvedValue({ dir: '/mnt/workspace/ws-1' });
    // One flat recursive listing, the way the workspace API answers: every
    // path relative to the workspace root, directories with no trailing slash.
    mockSandboxStorageService.listFiles.mockResolvedValue({
      entries: [
        { isDirectory: true, name: 'Spoon-Knife', path: 'hello-dev/Spoon-Knife' },
        { isDirectory: false, name: 'README.md', path: 'hello-dev/Spoon-Knife/README.md' },
        { isDirectory: false, name: 'README', path: 'hello-dev/README' },
      ],
      truncated: false,
    });

    const index = await projectFileService.getProjectFileIndex({
      sandboxInstanceId: 'inst-1',
      scope: 'hello-dev',
    });

    expect(index?.entries).toEqual([
      {
        isDirectory: true,
        name: 'Spoon-Knife',
        path: '/mnt/workspace/ws-1/hello-dev/Spoon-Knife',
        relativePath: 'Spoon-Knife/',
      },
      {
        isDirectory: false,
        name: 'README.md',
        path: '/mnt/workspace/ws-1/hello-dev/Spoon-Knife/README.md',
        relativePath: 'Spoon-Knife/README.md',
      },
      {
        isDirectory: false,
        name: 'README',
        path: '/mnt/workspace/ws-1/hello-dev/README',
        relativePath: 'README',
      },
    ]);
  });
});
