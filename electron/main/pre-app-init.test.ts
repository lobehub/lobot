import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { app, isDev } = vi.hoisted(() => ({
  app: {
    commandLine: { appendSwitch: vi.fn() },
    getPath: vi.fn(() => '/app-data'),
    setAppUserModelId: vi.fn(),
    setName: vi.fn(),
    setPath: vi.fn(),
  },
  isDev: vi.fn(() => true),
}));

vi.mock('electron', () => ({ app }));
vi.mock('@/utils/platform', () => ({ dev: isDev }));

const platform = Object.getOwnPropertyDescriptor(process, 'platform')!;

const load = async ({
  mockKeychain = true,
  platform: name,
  userData,
}: {
  mockKeychain?: boolean;
  platform: string;
  userData?: string;
}) => {
  Object.defineProperty(process, 'platform', { value: name });
  vi.stubEnv('LOBE_DESKTOP_USER_DATA_DIR', userData ?? '');
  vi.stubEnv('LOBE_DESKTOP_MOCK_KEYCHAIN', mockKeychain ? '1' : '');
  await import('./pre-app-init');
};

describe('pre-app-init', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    isDev.mockReturnValue(true);
  });

  afterEach(() => {
    Object.defineProperty(process, 'platform', platform);
    vi.unstubAllEnvs();
  });

  it('keeps a marked launcher-managed macOS instance off the system keychain', async () => {
    await load({ platform: 'darwin', userData: '/checkout/.cache/desktop-user-data' });

    expect(app.setPath).toHaveBeenCalledWith('userData', '/checkout/.cache/desktop-user-data');
    expect(app.commandLine.appendSwitch).toHaveBeenCalledWith('use-mock-keychain');
  });

  /** Regression: every launcher profile used the public mock key, including production logins. */
  it('keeps the keychain for a profile the launcher did not mark', async () => {
    await load({
      mockKeychain: false,
      platform: 'darwin',
      userData: '/checkout/.cache/desktop-user-data-online',
    });

    expect(app.commandLine.appendSwitch).not.toHaveBeenCalled();
  });

  it('keeps a dev Windows build off the installed shortcut', async () => {
    await load({ platform: 'win32' });

    expect(app.setAppUserModelId).toHaveBeenCalledWith('com.lobehub.lobot.dev');
  });

  it('stamps the installer app id on a packaged Windows build', async () => {
    isDev.mockReturnValue(false);
    await load({ platform: 'win32' });

    expect(app.setAppUserModelId).toHaveBeenCalledWith('com.lobehub.lobot');
  });

  it("stamps a distribution's app id when one is configured", async () => {
    isDev.mockReturnValue(false);
    vi.stubEnv('DESKTOP_APP_ID', 'com.acme.work');
    await load({ platform: 'win32' });

    expect(app.setAppUserModelId).toHaveBeenCalledWith('com.acme.work');
  });

  it('leaves the app id alone off Windows', async () => {
    await load({ platform: 'darwin' });

    expect(app.setAppUserModelId).not.toHaveBeenCalled();
  });

  it('keeps the keychain for the shared dev profile and other platforms', async () => {
    await load({ platform: 'darwin' });
    expect(app.setPath).toHaveBeenCalledWith('userData', path.join('/app-data', 'lobot-dev'));

    vi.resetModules();
    await load({ platform: 'linux', userData: '/checkout/.cache/desktop-user-data' });

    expect(app.commandLine.appendSwitch).not.toHaveBeenCalled();
  });
});
