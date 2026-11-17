import { ensureElectronIpc } from '@/utils/electron/ipc';

class GatewayConnectionService {
  connect = async () => {
    return ensureElectronIpc().gatewayConnection.connect();
  };

  getConnectionStatus = async () => {
    return ensureElectronIpc().gatewayConnection.getConnectionStatus();
  };

  getKeepAwake = async () => {
    return ensureElectronIpc().gatewayConnection.getKeepAwake();
  };

  setKeepAwake = async (enabled: boolean) => {
    return ensureElectronIpc().gatewayConnection.setKeepAwake({ enabled });
  };

  getDeviceInfo = async () => {
    return ensureElectronIpc().gatewayConnection.getDeviceInfo();
  };

  getStableDeviceId = async () => {
    return ensureElectronIpc().gatewayConnection.getStableDeviceId();
  };
}

export const gatewayConnectionService = new GatewayConnectionService();
