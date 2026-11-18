import { describe, expect, it } from 'vitest';

import { hasPresenceLabel, quotaExhaustion, resolveAgentPresence } from './agentPresence';

const now = 1_000_000;
const fresh = { enabled: true, sessionUtil: 20, weeklyUtil: 40 };
const benched = (until: number) => ({ enabled: true, rateLimitedUntil: until, sessionUtil: 100 });

describe('quotaExhaustion', () => {
  it('does not judge an agent without accounts', () => {
    expect(quotaExhaustion([], now)).toEqual({ exhausted: false });
    expect(quotaExhaustion([{ enabled: false, weeklyUtil: 100 }], now)).toEqual({
      exhausted: false,
    });
  });

  it('stays on duty while any enabled account has headroom', () => {
    expect(quotaExhaustion([benched(now + 10), fresh], now).exhausted).toBe(false);
  });

  it('ignores a rate limit that already lifted', () => {
    expect(quotaExhaustion([{ enabled: true, rateLimitedUntil: now - 1 }], now).exhausted).toBe(
      false,
    );
  });

  it('reports the earliest reset when every account says when it lifts', () => {
    expect(quotaExhaustion([benched(now + 50), benched(now + 20)], now)).toEqual({
      exhausted: true,
      resetsAt: now + 20,
    });
  });

  it('promises no reset time when a weekly limit is the one used up', () => {
    expect(quotaExhaustion([benched(now + 20), { enabled: true, weeklyUtil: 100 }], now)).toEqual({
      exhausted: true,
    });
  });
});

describe('resolveAgentPresence', () => {
  const online = { online: true };

  it('is offline when its device is disconnected or gone, whatever else holds', () => {
    expect(
      resolveAgentPresence({
        device: { online: false },
        deviceId: 'd1',
        loads: [],
        now,
        running: true,
      }).status,
    ).toBe('offline');
    expect(resolveAgentPresence({ deviceId: 'd1', loads: [], now, running: false }).status).toBe(
      'offline',
    );
  });

  it('is working while a run is in flight, even with the quota used up', () => {
    expect(
      resolveAgentPresence({
        device: online,
        deviceId: 'd1',
        loads: [benched(now + 10)],
        now,
        running: true,
      }).status,
    ).toBe('working');
  });

  it('is off duty with the quota used up and nothing running', () => {
    expect(
      resolveAgentPresence({
        device: online,
        deviceId: 'd1',
        loads: [benched(now + 10)],
        now,
        running: false,
      }),
    ).toEqual({ resetsAt: now + 10, status: 'offDuty' });
  });

  it('is idle on a connected device and online in the cloud', () => {
    expect(
      resolveAgentPresence({ device: online, deviceId: 'd1', loads: [fresh], now, running: false })
        .status,
    ).toBe('idle');
    expect(resolveAgentPresence({ loads: [fresh], now, running: false }).status).toBe('online');
  });
});

describe('a managed cloud device that is not connected', () => {
  const base = { deviceId: 'cloud-1', loads: [], now, running: false };

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
