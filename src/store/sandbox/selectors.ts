import type { SandboxState } from './initialState';
import { SANDBOX_SCOPE_ENTRY, type SandboxEntitlement } from './projection';

/** The active workspace's entitlement, or `undefined` before its first paint. */
const entitlement = (s: SandboxState): SandboxEntitlement | undefined =>
  s.sandboxEntitlementMap[SANDBOX_SCOPE_ENTRY];

export const sandboxSelectors = {
  entitlement,
};
