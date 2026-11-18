import { defineReplica, staticReplicaScope } from '@/libs/replica';
import { type GlobalRuntimeConfig } from '@/types/serverConfig';

export const GLOBAL_CONFIG_KEY = 'current';

/**
 * The server's runtime config, read once at boot before identity resolves and
 * independent of it, so it keeps one static scope. Memory only: the store
 * fields it fills gate features on `serverConfigInit`, which a persisted copy
 * from an older deploy must not satisfy.
 */
export const globalConfigResource = defineReplica<Record<string, never>, GlobalRuntimeConfig>({
  key: () => GLOBAL_CONFIG_KEY,
  name: 'globalRuntimeConfig',
  scope: staticReplicaScope('app'),
  storage: 'memory',
  version: 1,
});
