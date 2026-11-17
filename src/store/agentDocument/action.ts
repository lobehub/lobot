import { cacheScope, type ReplicaSyncResult } from '@/libs/replica';
import type { AgentDocumentListItem } from '@/services/agentDocument';
import type { StoreSetter } from '@/store/types';
import { setNamespace } from '@/utils/storeDebug';

import { type AgentDocumentState, initialState } from './initialState';
import { AgentDocumentPrivateAction } from './privateAction';
import { type AgentDocumentReaderParams } from './projection';
import { useAgentDocumentStore } from './store';

const n = setNamespace('agentDocument');

type Setter = StoreSetter<AgentDocumentState>;

type DocumentListEdit =
  | AgentDocumentListItem[]
  | ((prev: AgentDocumentListItem[] | undefined) => AgentDocumentListItem[] | undefined);

interface MutateDocumentListOptions {
  /** Re-sync from the server after the local edit. Defaults to `true`. */
  revalidate?: boolean;
}

interface UseFetchDocumentListOptions {
  /** Pause the sync (e.g. a panel hidden behind `<Activity>`). Defaults to `true`. */
  enabled?: boolean;
}

class AgentDocumentActionImpl {
  readonly #get: () => AgentDocumentState;
  readonly #private: AgentDocumentPrivateAction;
  readonly #set: Setter;

  constructor(
    set: Setter,
    get: () => AgentDocumentState,
    privateAction: AgentDocumentPrivateAction,
  ) {
    this.#get = get;
    this.#set = set;
    this.#private = privateAction;
  }

  /**
   * Fetch orchestration for one agent's document list. Every consumer shares the
   * one entry, so mounting several of them costs one request. Read the rows with
   * `agentDocumentSelectors.getDocumentList`, not from the return value.
   */
  useFetchDocumentList = (
    agentId?: string | null,
    { enabled = true }: UseFetchDocumentListOptions = {},
  ): ReplicaSyncResult =>
    this.#private.list.useSync(agentId || null, { enabled, revalidateOnFocus: false });

  /**
   * The agent's list, loading it when no view has it yet (an entity link
   * clicked before the documents panel ever mounted). Joins a sync in flight.
   */
  fetchDocumentList = async (agentId: string): Promise<AgentDocumentListItem[] | undefined> => {
    const loaded = this.#get().agentDocumentListMap[agentId];
    if (loaded) return loaded;
    await this.#private.list.fetch(agentId);
    return this.#get().agentDocumentListMap[agentId];
  };

  reset = (): void => {
    this.#set(initialState, false, n('reset'));
  };
}

const { getState, setState } = useAgentDocumentStore;

export const agentDocumentActions = new AgentDocumentActionImpl(
  setState,
  getState,
  new AgentDocumentPrivateAction(setState, getState),
);
