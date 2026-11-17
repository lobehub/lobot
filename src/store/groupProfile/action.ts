import { debounce } from 'es-toolkit/compat';
import { type StateCreator } from 'zustand';

import { EDITOR_DEBOUNCE_TIME, EDITOR_MAX_WAIT } from '@/const/index';
import { createReplicaSlice, createReplicaState, recordLens } from '@/libs/replica';
import { type StoreSetter } from '@/store/types';
import { flattenActions } from '@/store/utils/flattenActions';

import { type SaveState, type SaveStatus, type State } from './initialState';
import { initialState } from './initialState';
import { groupProfileSaveResource } from './projection';

type SaveContentPayload = {
  content: string;
  editorData: Record<string, any>;
};

type Action = Pick<ActionImpl, keyof ActionImpl>;
export type Store = State & Action;

// Store the latest saveCallback and tabId references to avoid stale closures
const saveCallbackRef: ((payload: SaveContentPayload) => Promise<void>) | null = null;
const currentTabIdRef: string | null = null;

const DEFAULT_SAVE_STATE: SaveState = { lastUpdatedTime: null, saveStatus: 'idle' };

type Setter = StoreSetter<Store>;
class ActionImpl {
  /** Local-first replica of the per-tab save status (`saveStateMap` is its view). */
  #saveStates;
  #set: Setter;

  constructor(set: Setter, get: () => Store, _api?: unknown) {
    // keep signature aligned with StateCreator params: (set, get, api)
    void _api;
    this.#set = set;

    this.#saveStates = createReplicaSlice(groupProfileSaveResource, {
      actionPrefix: 'groupProfile/save',
      get,
      set,
      stateKey: 'saveStateMapReplica',
      view: recordLens<Store, SaveState>('saveStateMap'),
    });

    debounce(
      async (payload: SaveContentPayload) => {
        const tabId = currentTabIdRef;
        if (!tabId) return;

        try {
          if (saveCallbackRef) {
            await saveCallbackRef(payload);
            this.#updateSaveStatusInternal(tabId, 'saved');
          }
        } catch (error) {
          console.error('[ProfileEditor] Failed to save:', error);
          this.#updateSaveStatusInternal(tabId, 'idle');
        }
      },
      EDITOR_DEBOUNCE_TIME,
      { leading: false, maxWait: EDITOR_MAX_WAIT, trailing: true },
    );
  }

  #updateSaveStatusInternal = (tabId: string, status: SaveStatus) => {
    // Write through the replica engine so the view and its bookkeeping slot
    // (`saveStateMapReplica`) always move together.
    this.#saveStates.update(tabId, (current) => {
      const previous = current ?? DEFAULT_SAVE_STATE;
      return {
        ...previous,
        lastUpdatedTime: status === 'saved' ? new Date() : previous.lastUpdatedTime,
        saveStatus: status,
      };
    });
  };

  setChatPanelExpanded = (expanded: boolean | ((prev: boolean) => boolean)): void => {
    if (typeof expanded === 'function') {
      this.#set((state) => ({ chatPanelExpanded: expanded(state.chatPanelExpanded) }));
    } else {
      this.#set({ chatPanelExpanded: expanded });
    }
  };
}

export const store: StateCreator<Store> = (...parameters: Parameters<StateCreator<Store>>) => ({
  ...initialState,
  ...flattenActions<Action>([new ActionImpl(...parameters)]),
});
