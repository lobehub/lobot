import type { ManagedDeviceStatus } from '@/features/DeviceManager/managedDeviceStatus';

/**
 * What an Agent is up to, as shown on its contact card:
 *
 * - `offline`: it runs on a device that is not connected, so nothing reaches it;
 * - `sleeping`: its managed cloud device is asleep; a message wakes it, so it
 *   still takes work, only the first reply is slower;
 * - `waking`: its managed cloud device is starting up;
 * - `working`: a conversation of its is running right now;
 * - `offDuty`: every account it can run on has used up its quota;
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
  /** When an off-duty Agent's quota comes back, if every account says so. */
  resetsAt?: number;
  status: AgentPresenceStatus;
}

/** One quota account's load, as `agentQuota.resolveAccountLoads` serves it. */
export interface QuotaAccountLoad {
  enabled: boolean;
  rateLimitedUntil?: number | null;
  sessionUtil?: number;
  weeklyUtil?: number;
}

/** A limit is used up at or above this utilization, as the account balancer counts it. */
const EXHAUSTED = 100;

const isExhausted = (load: QuotaAccountLoad, now: number) =>
  (load.rateLimitedUntil != null && load.rateLimitedUntil > now) ||
  (load.weeklyUtil ?? 0) >= EXHAUSTED ||
  (load.sessionUtil ?? 0) >= EXHAUSTED;

/**
 * The Agent's quota has run out: it has accounts and none of the enabled ones
 * has headroom left. An Agent without accounts is not judged by quota at all.
 */
export const quotaExhaustion = (
  loads: QuotaAccountLoad[],
  now: number,
): { exhausted: boolean; resetsAt?: number } => {
  const enabled = loads.filter((load) => load.enabled);
  if (enabled.length === 0 || !enabled.every((load) => isExhausted(load, now)))
    return { exhausted: false };

  // A weekly limit carries no reset time here, so only promise one when every
  // account is benched by a session limit that says when it lifts.
  const resets = enabled.map((load) =>
    load.rateLimitedUntil != null && load.rateLimitedUntil > now ? load.rateLimitedUntil : null,
  );
  if (resets.some((reset) => reset === null)) return { exhausted: true };

  return { exhausted: true, resetsAt: Math.min(...(resets as number[])) };
};

export const resolveAgentPresence = ({
  device,
  deviceId,
  loads,
  now,
  running,
}: {
  /** The bound device's presence, or `undefined` when the device list does not have it. */
  device?: { managedStatus?: ManagedDeviceStatus | null; online: boolean };
  /** The device the Agent runs on for the viewer; absent for a cloud Agent. */
  deviceId?: string;
  loads: QuotaAccountLoad[];
  now: number;
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

  const quota = quotaExhaustion(loads, now);
  if (quota.exhausted) return { resetsAt: quota.resetsAt, status: 'offDuty' };

  return { status: deviceId ? 'idle' : 'online' };
};
