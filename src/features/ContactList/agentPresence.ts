import type { QuotaAgentAvailability } from '@lobot/types';

import type { ManagedDeviceStatus } from '@/features/DeviceManager/managedDeviceStatus';

/**
 * What an Agent is up to, as shown on its contact card:
 *
 * - `offline`: it runs on a device that is not connected, so nothing reaches it;
 * - `sleeping`: its managed cloud device is asleep; a message wakes it, so it
 *   still takes work, only the first reply is slower;
 * - `waking`: its managed cloud device is starting up;
 * - `working`: a conversation of its is running right now;
 * - `offDuty`: every account its runs are routed to has used up its quota;
 * - `idle`: its device is connected and nothing is running;
 * - `online`: a cloud Agent with nothing running — it needs no device to answer.
 *
 * Checked in that order: a device that is not connected hides everything else, and a run
 * already in flight keeps going even after the quota tips over.
 */
export type AgentPresenceStatus =
  'idle' | 'offDuty' | 'offline' | 'online' | 'sleeping' | 'waking' | 'working';

/**
 * Statuses that only say "ready for work". Their chip is left out: the avatar
 * dot already says it, and a chip that pops in once presence loads shifts the
 * card's layout for no new information.
 */
const READY_STATUSES = new Set<AgentPresenceStatus>(['idle', 'online']);

export const hasPresenceLabel = (status: AgentPresenceStatus) => !READY_STATUSES.has(status);

export interface AgentPresence {
  /** When an off-duty Agent's quota comes back, when the server knows. */
  resetsAt?: number;
  status: AgentPresenceStatus;
}

export const resolveAgentPresence = ({
  device,
  deviceId,
  quota,
  running,
}: {
  /** The bound device's presence, or `undefined` when the device list does not have it. */
  device?: { managedStatus?: ManagedDeviceStatus | null; online: boolean };
  /** The device the Agent runs on for the viewer; absent for a cloud Agent. */
  deviceId?: string;
  /**
   * The server's quota verdict for the accounts a run is routed to (see
   * `agentQuota.resolveAgentAvailability`); absent when it could not be read.
   */
  quota?: Pick<QuotaAgentAvailability, 'resetsAt' | 'status'>;
  running: boolean;
}): AgentPresence => {
  if (deviceId && !device?.online) {
    switch (device?.managedStatus) {
      case 'sleeping':
      case 'stopping': {
        return { status: 'sleeping' };
      }
      case 'starting': {
        return { status: 'waking' };
      }
      default: {
        return { status: 'offline' };
      }
    }
  }
  if (running) return { status: 'working' };

  if (quota?.status === 'exhausted') return { resetsAt: quota.resetsAt, status: 'offDuty' };

  return { status: deviceId ? 'idle' : 'online' };
};
