import { type ToolStore } from '../../store';
import { type ComposioServer } from './types';

export const composioStoreSelectors = {
  getServers: (s: ToolStore): ComposioServer[] => s.composioServers || [],
};
