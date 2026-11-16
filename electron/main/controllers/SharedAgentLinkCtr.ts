import { createLogger } from '@/utils/logger';

import { ControllerModule, createProtocolHandler, IpcMethod } from '.';

const logger = createLogger('controllers:SharedAgentLinkCtr');

const protocolHandler = createProtocolHandler('channel');

/** Share ids, handles and pasted share links are all short; anything longer is not one. */
const MAX_SHARE_LENGTH = 512;

/**
 * `lobot://channel/open-shared?share=<share id, handle or link>`: a share page's "Open in Lobot"
 * opens the conversation with another person's shared Agent here.
 *
 * The link is held until the signed-in app takes it: a cold start, or a person who still has to
 * sign in, can open the app long before anything listens. The renderer takes it on mount and
 * whenever the broadcast says a new one arrived, so each link opens once.
 */
export default class SharedAgentLinkCtr extends ControllerModule {
  static override readonly groupName = 'sharedAgentLink';

  private pendingShare: string | undefined;

  @protocolHandler('open-shared')
  async handleOpenShared(params: { share?: string }): Promise<boolean> {
    const share = params.share?.trim();
    if (!share || share.length > MAX_SHARE_LENGTH) {
      logger.warn('Ignoring an open-shared link without a usable share');
      return false;
    }
    this.pendingShare = share;
    this.app.browserManager.broadcastToWindow('app', 'sharedAgentLinkReceived', undefined);
    return true;
  }

  /** The link waiting to be opened, cleared as it is taken. */
  @IpcMethod()
  async takePending(): Promise<string | null> {
    const share = this.pendingShare;
    this.pendingShare = undefined;
    return share ?? null;
  }
}
