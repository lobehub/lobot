import { cacheScope } from '@/libs/replica';
import { errorInScope } from '@/utils/connectorActionError';

import { type ToolStore } from '../../store';
import { type ComposioServer, ComposioServerStatus } from './types';

export const composioStoreSelectors = {
  getServers: (s: ToolStore): ComposioServer[] => s.composioServers || [],
};
