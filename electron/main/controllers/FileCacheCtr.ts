import type { FileCacheStats } from '@/core/infrastructure/FileCacheProtocolManager';

import { ControllerModule, IpcMethod } from './index';

/** Electron IPC seam for the disk cache behind `lobe-file-cache://`. */
export default class FileCacheCtr extends ControllerModule {
  static override readonly groupName = 'fileCache';

  private get manager() {
    return this.app.fileCacheProtocolManager;
  }

  /** Size and count of the files held in the pool. */
  @IpcMethod()
  async getStats(): Promise<FileCacheStats> {
    return this.manager.stats();
  }

  /** Release the whole pool and return what it held. Media downloads again on its next load. */
  @IpcMethod()
  async clear(): Promise<FileCacheStats> {
    return this.manager.clear();
  }

  /** Release one file's disk copy, e.g. after the file is deleted. */
  @IpcMethod()
  async evict(params: { fileId: string }): Promise<void> {
    await this.manager.evict(params.fileId);
  }
}
