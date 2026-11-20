import { dev } from '@/utils/platform';

/** electron-builder's default id, stamped on the installed Start Menu shortcut. */
const INSTALLED_APP_USER_MODEL_ID = 'com.lobehub.lobot';

/**
 * Identity Windows uses for toasts. A dev build runs from `electron.exe`; if it
 * reuses the installed id, Electron rewrites that shortcut to the SDK binary.
 * Production toasts then show up as Electron and open its welcome window.
 */
export const windowsAppUserModelId = (configured?: string): string => {
  const appId = configured || INSTALLED_APP_USER_MODEL_ID;
  return dev() ? `${appId}.dev` : appId;
};
