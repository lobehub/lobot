import { describe, expect, it } from 'vitest';

import { contactSelectors } from './selectors';

describe('contactSelectors.personalIncomingCount', () => {
  it('counts only the incoming requests of the personal space, 0 until loaded', () => {
    expect(contactSelectors.personalIncomingCount({ personalRequestsMap: {} } as any)).toBe(0);
    expect(
      contactSelectors.personalIncomingCount({
        personalRequestsMap: {
          personal: [
            { direction: 'incoming' },
            { direction: 'outgoing' },
            { direction: 'incoming' },
          ],
        },
      } as any),
    ).toBe(2);
  });
});
