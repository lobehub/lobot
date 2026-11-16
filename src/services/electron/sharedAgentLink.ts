import { ensureElectronIpc } from '@/utils/electron/ipc';

class SharedAgentLinkService {
  /** The `lobot://channel/open-shared` link waiting to be opened, if any; taking it clears it. */
  takePending = async (): Promise<string | null> =>
    ensureElectronIpc().sharedAgentLink.takePending();
}

export const sharedAgentLinkService = new SharedAgentLinkService();
