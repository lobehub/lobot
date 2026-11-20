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

describe('contactSelectors.sharedAgent', () => {
  const agent = { agentId: 'agt_1', shareId: 'shr_1', slug: 'wannuo', title: 'Writer' };
  const listMap = { all: [{ agent, available: true, type: 'agent' }] };

  it('paints an Agent in my Contacts from the contact list before the lookup answers', () => {
    const state = { listMap, shareMap: {} } as any;

    expect(contactSelectors.sharedAgent('shr_1')(state)).toEqual({
      agent,
      relation: 'contact',
      type: 'agent',
    });
    expect(contactSelectors.sharedAgent('wannuo')(state)?.agent).toBe(agent);
    expect(contactSelectors.sharedAgent('shr_other')(state)).toBeUndefined();
  });

  it('prefers the lookup once it answers, including an unavailable share', () => {
    const fetched = { ...agent, title: 'Writer v2' };
    expect(
      contactSelectors.sharedAgent('shr_1')({
        listMap,
        shareMap: { shr_1: [{ agent: fetched, relation: 'contact', type: 'agent' }] },
      } as any)?.agent,
    ).toBe(fetched);
    expect(
      contactSelectors.sharedAgent('shr_1')({ listMap, shareMap: { shr_1: [] } } as any),
    ).toBeNull();
  });
});
