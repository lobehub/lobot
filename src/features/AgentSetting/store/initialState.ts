import { type LobeAgentConfig } from '@/types/agent';
import { type MetaData } from '@/types/meta';

export type LoadingState = Record<Partial<keyof MetaData> | string, boolean>;
export type SaveStatus = 'idle' | 'saving' | 'saved';

export interface State {
  config: LobeAgentConfig;
  disabled?: boolean;
  id?: string;
  lastUpdatedTime?: Date | null;
  loading?: boolean;
  loadingState?: LoadingState;
  meta: MetaData;
  onConfigChange?: (config: LobeAgentConfig) => void;
  onMetaChange?: (meta: MetaData) => void;
  saveStatus?: SaveStatus;
}
