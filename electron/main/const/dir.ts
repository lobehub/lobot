import path from 'node:path';

import { app } from 'electron';

const mainDir = path.join(__dirname);

export const preloadDir = path.join(mainDir, '../preload');

export const resourcesDir = path.join(mainDir, '../../resources');

export const buildDir = path.join(mainDir, '../../build');

export const binDir = app.isPackaged
  ? path.join(process.resourcesPath, 'bin')
  : path.join(resourcesDir, 'bin');

export const rendererDir = path.join(mainDir, '../renderer');

const userDataDir = app.getPath('userData');

export const appStorageDir = path.join(userDataDir, 'lobehub-storage');

// Legacy local database directory used in older desktop versions
export const legacyLocalDbDir = path.join(appStorageDir, 'lobehub-local-db');

// ------  Application storage directory ---- //

// Local storage files (simulating S3)
export const FILE_STORAGE_DIR = 'file-storage';
// Disk copies of remote images, keyed by file id
export const FILE_CACHE_DIR = 'file-cache';
// Plugin installation directory

// Desktop file service
export const LOCAL_STORAGE_URL_PREFIX = '/lobe-desktop-file';
