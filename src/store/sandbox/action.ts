import { type ReplicaSyncResult } from '@/libs/replica';
import type { StoreSetter } from '@/store/types';
import { setNamespace } from '@/utils/storeDebug';

import { initialState, type SandboxState } from './initialState';
import { SandboxPrivateAction } from './privateAction';
import { SANDBOX_SCOPE_ENTRY, type SandboxPlacementParams } from './projection';
import { useSandboxStore } from './store';

const n = setNamespace('sandbox');

type Setter = StoreSetter<SandboxState>;

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

  /** The environments a folder or conversation can start from; read with `sandboxSelectors.environments`. */
  useFetchEnvironments = (): ReplicaSyncResult =>
    this.#private.environments.useSync(SANDBOX_SCOPE_ENTRY);

  refreshEnvironments = (): Promise<unknown> =>
    this.#private.environments.revalidate(SANDBOX_SCOPE_ENTRY);

  /** A legacy environment directory's own row; `undefined` disables the read. */
  useFetchInstanceDirectory = (instanceId: string | undefined): ReplicaSyncResult =>
    this.#private.instanceDirectory.useSync(instanceId);

  /**
   * Whether a topic's persistent pick still holds, asked of the resolver the
   * run uses; `null` disables the read. Read with `sandboxSelectors.placement`.
   */
  useFetchPlacement = (params: SandboxPlacementParams | null): ReplicaSyncResult =>
    this.#private.placement.useSync(params, { revalidateOnFocus: true });

  /** Read with `sandboxSelectors.githubRepositories`. */
  useFetchGithubRepositories = (): ReplicaSyncResult =>
    this.#private.githubRepositories.useSync(SANDBOX_SCOPE_ENTRY);

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
