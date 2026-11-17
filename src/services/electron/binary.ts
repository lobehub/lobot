import {
  type BinaryCategory,
  type BinaryInfo,
  type BinaryStatus,
  type DetectHeterogeneousAgentCommandParams,
} from '@lobechat/electron-client-ipc';

import { ensureElectronIpc } from '@/utils/electron/ipc';

class BinaryService {
  detectHeterogeneousAgentCommand = async (
    params: DetectHeterogeneousAgentCommandParams,
  ): Promise<BinaryStatus> => {
    return ensureElectronIpc().binary.detectHeterogeneousAgentCommand(params);
  };
}

export const binaryService = new BinaryService();
