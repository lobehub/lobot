import { cacheScope } from '@/libs/replica';
import { errorInScope } from '@/utils/connectorActionError';

import { type ToolStore } from '../../store';
import { type ComposioServer } from './types';

export const composioStoreSelectors = {
  getServerByIdentifier: (identifier: string) => (s: ToolStore) =>
    s.composioServers?.find((server) => server.identifier === identifier),

  getServerError: (identifier: string) => (s: ToolStore) =>
    errorInScope(s.composioServerErrors?.[identifier], cacheScope.get()),

  getServers: (s: ToolStore): ComposioServer[] => s.composioServers || [],
};
