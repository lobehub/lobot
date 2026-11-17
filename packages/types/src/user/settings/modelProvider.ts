import type { ChatModelCard } from '../../llm';
import type { AiFullModelCard } from '../../modelBank';

export interface ProviderConfig {
  /**
   * whether to auto fetch model lists
   */
  autoFetchModelLists?: boolean;
  /**
   * user defined model cards
   */
  customModelCards?: ChatModelCard[];
  enabled: boolean;
  /**
   * enabled models id
   */
  enabledModels?: string[] | null;
  /**
   * whether fetch on client
   */
  fetchOnClient?: boolean;
  /**
   * the latest fetch model list time
   */
  latestFetchTime?: number;
  /**
   * fetched models from provider side
   */
  remoteModelCards?: ChatModelCard[];
  serverModelLists?: AiFullModelCard[];
}

export type GlobalLLMProviderKey = string;

export type UserModelProviderConfig = Record<string, ProviderConfig>;
