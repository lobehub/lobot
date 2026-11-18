import type { BrowserGatewayToolResultParams } from '@lobechat/electron-client-ipc';

import { ensureElectronIpc } from '@/utils/electron/ipc';

class ElectronBrowserControlService {
  private get ipc() {
    return ensureElectronIpc();
  }

  reportGatewayToolResult(params: BrowserGatewayToolResultParams): Promise<void> {
    return this.ipc.browserControl.reportGatewayToolResult(params);
  }
}

export const electronBrowserControlService = new ElectronBrowserControlService();
