import type { UpdateChannel } from '@lobechat/electron-client-ipc';

import type { UpdateEngine } from './engine';

/**
 * HarmonyOS build: the app ships through AppGallery, which owns installs and
 * updates. electron-updater has no installer for a HAP, so the engine reports
 * itself inactive and the updater UI shows "unsupported".
 */
const storeManagedEngine: UpdateEngine = {
  checkForUpdates: async () => null,
  configure: () => {},
  downloadUpdate: async () => null,
  installOnQuit: () => {},
  isActive: () => false,
  kind: 'electron-updater',
  on: () => {},
  quitAndInstall: () => {},
};

export const createUpdateEngine = async (_channel: UpdateChannel): Promise<UpdateEngine> =>
  storeManagedEngine;
