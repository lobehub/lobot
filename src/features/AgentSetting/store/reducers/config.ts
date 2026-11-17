import type { PartialDeep } from 'type-fest';

import type { LobeAgentConfig } from '@/types/agent';

export type ConfigDispatch =
  | { config: PartialDeep<LobeAgentConfig>; type: 'update' }
  | { pluginId: string; state?: boolean; type: 'togglePlugin' }
  | { type: 'reset' };
