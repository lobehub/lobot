import { cacheScope, revalidateReplica } from '@/libs/replica';

/** Replica name of one agent's resolved device binding (`agentDeviceBindingResource`). */
export const AGENT_DEVICE_BINDING_REPLICA = 'agentDeviceBinding';

/**
 * Re-resolve every mounted agent device binding (see `useFetchAgentDeviceBinding`).
 * The binding the server resolves for the caller changes whenever an agent's
 * execution target or device changes, or the caller's own per-agent device
 * override does — call this after those writes settle so a mounted card does
 * not keep showing the previous device's status until the next focus or remount.
 *
 * A leaf module on purpose: the agent and user stores call it after a routing
 * write, and importing the device store (or its projection) from them would
 * close a module cycle through `@/libs/replica`.
 */
export const refreshAgentDeviceBindings = () =>
  revalidateReplica({ name: AGENT_DEVICE_BINDING_REPLICA, scope: cacheScope });
