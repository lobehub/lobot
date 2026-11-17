import type { ReplicaSyncResult } from '@/libs/replica';
import { messengerService } from '@/services/messenger';
import type { StoreSetter } from '@/store/types';
import { setNamespace } from '@/utils/storeDebug';

import { initialMessengerState, type MessengerState } from './initialState';
import { MessengerPrivateAction } from './privateAction';
import {
  MESSENGER_LIST_KEY,
  MESSENGER_LIST_PARAMS,
  type MessengerInstallationItem,
  type MessengerLinkItem,
  type MessengerPushWindowParams,
} from './projection';
import { useMessengerStore } from './store';

const n = setNamespace('messenger');

/**
 * The settings page, the file row menus (one hook per row) and the verify flow
 * all read the same lists: collapse their mounts into one request.
 */
const LIST_DEDUPING_INTERVAL = 10_000;

const PUSH_WINDOW_REFRESH_INTERVAL = 5000;

type MessengerPlatform = MessengerPushWindowParams['platform'];

interface LinkTarget {
  platform: MessengerPlatform;
  tenantId?: string;
}

interface ListSyncOptions {
  enabled?: boolean;
  revalidateOnFocus?: boolean;
}

type Setter = StoreSetter<MessengerState>;

class MessengerActionImpl {
  readonly #set: Setter;

  constructor(set: Setter, _get: () => MessengerState, privateAction: MessengerPrivateAction) {
    this.#set = set;
  }

  reset = (): void => {
    this.#set(initialMessengerState, false, n('reset'));
  };
}

export const messengerActions = new MessengerActionImpl(
  useMessengerStore.setState,
  useMessengerStore.getState,
  new MessengerPrivateAction(useMessengerStore.setState, useMessengerStore.getState),
);
