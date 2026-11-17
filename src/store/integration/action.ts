import type { StoreSetter } from '@/store/types';
import { setNamespace } from '@/utils/storeDebug';

import { initialIntegrationState, type IntegrationState } from './initialState';
import { IntegrationPrivateAction } from './privateAction';
import { INTEGRATION_PARAMS } from './projection';
import { useIntegrationStore } from './store';

const n = setNamespace('integration');

/** The overview card and the detail page mount the same reads. */
const DEDUPING_INTERVAL = 10_000;

type Setter = StoreSetter<IntegrationState>;

class IntegrationActionImpl {
  readonly #set: Setter;

  constructor(set: Setter, _get: () => IntegrationState, privateAction: IntegrationPrivateAction) {
    this.#set = set;
  }

  reset = (): void => {
    this.#set(initialIntegrationState, false, n('reset'));
  };
}

export const integrationActions = new IntegrationActionImpl(
  useIntegrationStore.setState,
  useIntegrationStore.getState,
  new IntegrationPrivateAction(useIntegrationStore.setState, useIntegrationStore.getState),
);
