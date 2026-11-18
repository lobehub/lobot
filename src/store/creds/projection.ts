import type { ContextCredSummary } from '@/helpers/claudeCodeTokenCred';
import { defineReplica } from '@/libs/replica';

export const CREDS_FOR_CONTEXT_KEY = 'listForContext';

/**
 * The credentials a run in the active scope reads (the workspace's
 * organization view inside a workspace, the personal vault otherwise). The
 * cache scope carries the workspace, so a switch never serves the previous
 * workspace's list. Summaries only (key, name, owner): no secret is stored.
 */
export const credsForContextResource = defineReplica<Record<string, never>, ContextCredSummary[]>({
  key: () => CREDS_FOR_CONTEXT_KEY,
  name: 'credsForContext',
  storage: 'indexedDB',
  version: 1,
});
