import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { app as electronApp } from 'electron';

import { STORE_DEFAULTS, STORE_NAME } from '@/const/store';
import type { ElectronMainStore, StoreKey } from '@/types/store';
import { makeSureDirExist } from '@/utils/file-system';
import { createLogger } from '@/utils/logger';

import type { App } from '../App';

const logger = createLogger('core:StoreManager');

/**
 * HarmonyOS build: `electron-store` aborts the process natively on this port
 * (its ESM entry runs a native path that the OpenHarmony adapter cannot serve,
 * killing the main process with SIGABRT while the module is being evaluated).
 *
 * This variant keeps the exact public surface the app depends on and backs it
 * with a plain JSON file, so `get`/`set`/`delete`/`has`/`clear` behave the same
 * without pulling in `electron-store` at all.
 */
export class StoreManager {
  private app: App;
  private defaults: Record<string, any> = STORE_DEFAULTS as Record<string, any>;
  private filePath: string;
  private data: Record<string, any>;

  constructor(app: App) {
    logger.debug('Initializing StoreManager (harmony)');
    this.app = app;

    let baseDir: string;
    try {
      baseDir = electronApp.getPath('userData');
    } catch {
      baseDir = path.join(electronApp.getPath('temp'), STORE_NAME);
    }

    makeSureDirExist(baseDir);
    this.filePath = path.join(baseDir, `${STORE_NAME}.json`);
    this.data = this.readFromDisk();

    const storagePath = this.get('storagePath') as string | undefined;
    if (storagePath) makeSureDirExist(storagePath);
    logger.info('StoreManager (harmony) initialized at:', this.filePath);
  }

  private readFromDisk(): Record<string, any> {
    let parsed: Record<string, any> = {};
    try {
      if (existsSync(this.filePath)) {
        parsed = JSON.parse(readFileSync(this.filePath, 'utf8')) as Record<string, any>;
      }
    } catch (error) {
      logger.warn('Failed to read store file, falling back to defaults:', error);
    }
    return { ...this.defaults, ...parsed };
  }

  private writeToDisk() {
    try {
      writeFileSync(this.filePath, JSON.stringify(this.data, null, 2), 'utf8');
    } catch (error) {
      logger.error('Failed to persist store file:', error);
    }
  }

  get<K extends StoreKey>(key: K, defaultValue?: ElectronMainStore[K]): ElectronMainStore[K] {
    const value = this.data[key as string];
    return (value ?? defaultValue ?? this.defaults[key as string]) as ElectronMainStore[K];
  }

  set<K extends StoreKey>(key: K, value: ElectronMainStore[K]): void {
    this.data[key as string] = value;
    this.writeToDisk();
  }

  delete(key: StoreKey): void {
    delete this.data[key as string];
    this.writeToDisk();
  }

  clear(): void {
    this.data = { ...this.defaults };
    this.writeToDisk();
  }

  has(key: StoreKey): boolean {
    return key as string in this.data;
  }

  async openInEditor() {
    logger.info('openInEditor is not supported on HarmonyOS');
  }
}
