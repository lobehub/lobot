import { type ReplicaSyncResult } from '@/libs/replica';
import type { StoreSetter } from '@/store/types';
import { setNamespace } from '@/utils/storeDebug';

import { initialState, type SandboxState } from './initialState';
import { SandboxPrivateAction } from './privateAction';
import { SANDBOX_SCOPE_ENTRY } from './projection';
import { useSandboxStore } from './store';

const n = setNamespace('sandbox');

type Setter = StoreSetter<SandboxState>;

/** How often a building copy is re-listed while the picker can see it. */
const BUILD_REFRESH_MS = 4000;

interface UseFetchEntitlementOptions {
  /** Revalidate when the window regains focus. Defaults to `true`. */
  revalidateOnFocus?: boolean;
}

class SandboxActionImpl {
  readonly #private: SandboxPrivateAction;
  readonly #set: Setter;

  constructor(set: Setter, _get: () => SandboxState, privateAction: SandboxPrivateAction) {
    this.#set = set;
    this.#private = privateAction;
  }

  /**
   * The active workspace's sandbox-storage entitlement. Read it with
   * `sandboxSelectors.entitlement`. The composer and the environments page share
   * this one entry, so the two never disagree.
   */
  useFetchEntitlement = (
    enabled: boolean,
    { revalidateOnFocus = true }: UseFetchEntitlementOptions = {},
  ): ReplicaSyncResult =>
    this.#private.entitlement.useSync(enabled ? SANDBOX_SCOPE_ENTRY : null, { revalidateOnFocus });

  reset = (): void => {
    this.#set(initialState, false, n('reset'));
  };
}

const { getState, setState } = useSandboxStore;

export const sandboxActions = new SandboxActionImpl(
  setState,
  getState,
  new SandboxPrivateAction(setState, getState),
);
