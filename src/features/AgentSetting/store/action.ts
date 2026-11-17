import { type PartialDeep } from 'type-fest';

import { type LobeAgentChatConfig, type LobeAgentConfig } from '@/types/agent';
import { type MetaData } from '@/types/meta';

import { type LoadingState, type SaveStatus, type State } from '../store/initialState';
import { type ConfigDispatch } from './reducers/config';
import { type MetaDataDispatch } from './reducers/meta';

interface Action {
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
