import { describe, expect, it } from 'vitest';

import { hasPresenceLabel } from './agentPresence';

describe('hasPresenceLabel', () => {
  // The card shows no chip for "ready" states: it popped in after load and shifted the layout.
  it('leaves the chip out for ready states and keeps it for the rest', () => {
    expect(hasPresenceLabel('online')).toBe(false);
    expect(hasPresenceLabel('idle')).toBe(false);
    for (const status of ['offline', 'sleeping', 'waking', 'working', 'offDuty'] as const)
      expect(hasPresenceLabel(status)).toBe(true);
  });
});
