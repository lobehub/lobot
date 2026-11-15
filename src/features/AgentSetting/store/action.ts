import { type PartialDeep } from 'type-fest';
import { type StateCreator } from 'zustand/vanilla';

import { analyticsClient } from '@/libs/analytics/client';
import { useUserStore } from '@/store/user';
import { type LobeAgentChatConfig, type LobeAgentConfig } from '@/types/agent';
import { type MetaData } from '@/types/meta';
import { merge } from '@/utils/merge';
import { setNamespace } from '@/utils/storeDebug';

import { type LoadingState, type SaveStatus, type State } from '../store/initialState';
import { initialState } from './initialState';
import { type ConfigDispatch } from './reducers/config';
import { configReducer } from './reducers/config';
import { type MetaDataDispatch } from './reducers/meta';
import { metaDataReducer } from './reducers/meta';

export interface Action {
  dispatchConfig: (payload: ConfigDispatch) => Promise<void>;
  dispatchMeta: (payload: MetaDataDispatch) => Promise<void>;

  resetAgentConfig: () => Promise<void>;

  resetAgentMeta: () => Promise<void>;
  setAgentConfig: (config: PartialDeep<LobeAgentConfig>) => Promise<void>;
  setAgentMeta: (meta: Partial<MetaData>) => Promise<void>;

  setChatConfig: (config: Partial<LobeAgentChatConfig>) => Promise<void>;
  toggleAgentPlugin: (pluginId: string, state?: boolean) => void;

  /**
   * Update loading state
   * @param key - Key of SessionLoadingState
   * @param value - Value of the loading state
   */
  updateLoadingState: (key: keyof LoadingState, value: boolean) => void;
  /**
   * Update save status
   * @param status - Save status
   */
  updateSaveStatus: (status: SaveStatus) => void;
}

export type Store = Action & State;

const t = setNamespace('AgentSettings');

export const store: StateCreator<Store, [['zustand/devtools', never]]> = (set, get) => ({
  ...initialState,
  dispatchConfig: async (payload) => {
    const nextConfig = configReducer(get().config, payload);

    set({ config: nextConfig }, false, payload);

    if (get().onConfigChange) {
      get().updateSaveStatus('saving');
      try {
        await get().onConfigChange?.(nextConfig);
        get().updateSaveStatus('saved');
      } catch (error: any) {
        if (error?.name === 'AbortError' || error?.message?.includes('aborted')) {
          get().updateSaveStatus('idle');
        } else {
          console.error('[AgentSettings] Failed to save config:', error);
          get().updateSaveStatus('idle');
        }
      }
    }
  },
  dispatchMeta: async (payload) => {
    const nextValue = metaDataReducer(get().meta, payload);

    set({ meta: nextValue }, false, payload);

    if (get().onMetaChange) {
      get().updateSaveStatus('saving');
      try {
        await get().onMetaChange?.(nextValue);
        get().updateSaveStatus('saved');
      } catch (error: any) {
        if (error?.name === 'AbortError' || error?.message?.includes('aborted')) {
          get().updateSaveStatus('idle');
        } else {
          console.error('[AgentSettings] Failed to save meta:', error);
          get().updateSaveStatus('idle');
        }
      }
    }
  },
  resetAgentConfig: async () => {
    await get().dispatchConfig({ type: 'reset' });
  },

  resetAgentMeta: async () => {
    await get().dispatchMeta({ type: 'reset' });
  },
  setAgentConfig: async (config) => {
    await get().dispatchConfig({ config, type: 'update' });
  },
  setAgentMeta: async (meta) => {
    const { dispatchMeta, id, meta: currentMeta } = get();
    const mergedMeta = merge(currentMeta, meta);

    try {
      void analyticsClient.track({
        name: 'agent_meta_updated',
        properties: {
          assistant_avatar: mergedMeta.avatar,
          assistant_background_color: mergedMeta.backgroundColor,
          assistant_description: mergedMeta.description,
          assistant_name: mergedMeta.title,
          assistant_tags: mergedMeta.tags,
          is_inbox: id === 'inbox',
          session_id: id || 'unknown',
          timestamp: Date.now(),
          user_id: useUserStore.getState().user?.id || 'anonymous',
        },
      });
    } catch (error) {
      console.warn('Failed to track agent meta update:', error);
    }
    await dispatchMeta({ type: 'update', value: meta });
  },

  setChatConfig: async (config) => {
    await get().setAgentConfig({ chatConfig: config });
  },

  toggleAgentPlugin: (id, state) => {
    get().dispatchConfig({ pluginId: id, state, type: 'togglePlugin' });
  },

  updateLoadingState: (key, value) => {
    set(
      { loadingState: { ...get().loadingState, [key]: value } },
      false,
      t('updateLoadingState', { key, value }),
    );
  },

  updateSaveStatus: (status) => {
    set(
      {
        lastUpdatedTime: status === 'saved' ? new Date() : get().lastUpdatedTime,
        saveStatus: status,
      },
      false,
      t('updateSaveStatus', { status }),
    );
  },
});
