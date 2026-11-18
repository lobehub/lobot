import { describe, expect, it } from 'vitest';

import { hasPresenceLabel, resolveAgentPresence } from './agentPresence';

const resetsAt = 1_000_010;
const available = { status: 'available' } as const;
const exhausted = { resetsAt, status: 'exhausted' } as const;

describe('resolveAgentPresence', () => {
  const online = { online: true };

  it('is offline when its device is disconnected or gone, whatever else holds', () => {
    expect(
      resolveAgentPresence({
        device: { online: false },
        deviceId: 'd1',
        running: true,
      }).status,
    ).toBe('offline');
    expect(resolveAgentPresence({ deviceId: 'd1', running: false }).status).toBe('offline');
  });

  it('is working while a run is in flight, even with the quota used up', () => {
    expect(
      resolveAgentPresence({
        device: online,
        deviceId: 'd1',
        quota: exhausted,
        running: true,
      }).status,
    ).toBe('working');
  });

  it('is off duty with the quota used up and nothing running', () => {
    expect(
      resolveAgentPresence({
        device: online,
        deviceId: 'd1',
        quota: exhausted,
        running: false,
      }),
    ).toEqual({ resetsAt, status: 'offDuty' });
  });

  it('is not judged by quota the server does not track or could not read', () => {
    for (const quota of [{ status: 'untracked' } as const, undefined])
      expect(
        resolveAgentPresence({ device: online, deviceId: 'd1', quota, running: false }).status,
      ).toBe('idle');
  });

  it('is idle on a connected device and online in the cloud', () => {
    expect(
      resolveAgentPresence({ device: online, deviceId: 'd1', quota: available, running: false })
        .status,
    ).toBe('idle');
    expect(resolveAgentPresence({ quota: available, running: false }).status).toBe('online');
  });
});

describe('a managed cloud device that is not connected', () => {
  const base = { deviceId: 'cloud-1', running: false };

  // Regression: an Agent on a sleeping cloud device read "Offline", as if a
  // message would never reach it, while a message actually wakes the device.
  it('is asleep, not offline, while its device sleeps', () => {
    for (const managedStatus of ['sleeping', 'stopping'] as const)
      expect(
        resolveAgentPresence({ ...base, device: { managedStatus, online: false } }).status,
      ).toBe('sleeping');
  });

  it('is waking while its device starts, even with a run waiting on it', () => {
    expect(
      resolveAgentPresence({
        ...base,
        device: { managedStatus: 'starting', online: false },
        running: true,
      }).status,
    ).toBe('waking');
  });

  it('is offline when its device failed or is being deleted', () => {
    for (const managedStatus of ['failed', 'deleting', null] as const)
      expect(
        resolveAgentPresence({ ...base, device: { managedStatus, online: false } }).status,
      ).toBe('offline');
  });

  it('follows the connection once the device is up again', () => {
    expect(
      resolveAgentPresence({ ...base, device: { managedStatus: null, online: true } }).status,
    ).toBe('idle');
  });
});

describe('hasPresenceLabel', () => {
  // The card shows no chip for "ready" states: it popped in after load and shifted the layout.
  it('leaves the chip out for ready states and keeps it for the rest', () => {
    expect(hasPresenceLabel('online')).toBe(false);
    expect(hasPresenceLabel('idle')).toBe(false);
    for (const status of ['offline', 'sleeping', 'waking', 'working', 'offDuty'] as const)
      expect(hasPresenceLabel(status)).toBe(true);
  });
});
