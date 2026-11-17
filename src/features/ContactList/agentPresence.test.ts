import { describe, expect, it } from 'vitest';

import { quotaExhaustion, resolveAgentPresence } from './agentPresence';

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
