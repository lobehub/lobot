import { BaseExecutor } from '@lobot/types';

import { BrowserIdentifier } from './types';

const BrowserApiEnum = {
  click: 'click' as const,
  fill: 'fill' as const,
  navigate: 'navigate' as const,
  press: 'press' as const,
  readPage: 'readPage' as const,
  screenshot: 'screenshot' as const,
  scroll: 'scroll' as const,
  setViewport: 'setViewport' as const,
  snapshot: 'snapshot' as const,
};

/**
 * Browser Tool Executor (client / desktop only)
 *
 * Drives the in-app browser through the Electron IPC control gateway. Pages are
 * owned by the main process and keyed by session (`topic:<topicId>`), so every
 * topic drives its own page whether or not the user is watching it — a run in a
 * background topic never touches the page in front of the user, and two topics
 * of the same agent no longer trample each other's page.
 */
class BrowserExecutor extends BaseExecutor<typeof BrowserApiEnum> {
  readonly identifier = BrowserIdentifier;
  protected readonly apiEnum = BrowserApiEnum;
}

// Export the executor instance for registration
export const browserExecutor = new BrowserExecutor();
