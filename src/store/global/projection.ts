import { defineReplica, staticReplicaScope } from '@/libs/replica';

/**
 * Version checks of the running app: the latest published release and, on
 * desktop against a self-hosted server, that server's version. Neither belongs
 * to a user or workspace, so they share one static scope. Memory only: the UI
 * reads the comparison the store derives from a network answer, never the raw
 * value, so a persisted copy would paint nothing.
 */
const versionScope = staticReplicaScope('app');

export const VERSION_CHECK_KEY = 'current';

export const latestVersionResource = defineReplica<Record<string, never>, string>({
  key: () => VERSION_CHECK_KEY,
  name: 'latestAppVersion',
  scope: versionScope,
  storage: 'memory',
  version: 1,
});

/** `version` is `null` when the server predates the version endpoint. */
export interface ServerVersionValue {
  version: string | null;
}

export const serverVersionResource = defineReplica<Record<string, never>, ServerVersionValue>({
  key: () => VERSION_CHECK_KEY,
  name: 'selfHostedServerVersion',
  scope: versionScope,
  storage: 'memory',
  version: 1,
});
