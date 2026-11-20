import { describe, expect, it } from 'vitest';

import { canPinContact } from './contactPin';

describe('canPinContact', () => {
  it('lets anyone pin in their personal space', () => {
    expect(canPinContact({ canManageTeamPins: false, inWorkspace: false })).toBe(true);
  });

  // A shared Agent's pin orders everyone's Contacts; the server lets only owners and admins move it.
  it('keeps the pin of a shared workspace Agent to owners and admins', () => {
    expect(
      canPinContact({ canManageTeamPins: false, inWorkspace: true, visibility: 'public' }),
    ).toBe(false);
    expect(canPinContact({ canManageTeamPins: false, inWorkspace: true })).toBe(false);
    expect(
      canPinContact({ canManageTeamPins: true, inWorkspace: true, visibility: 'public' }),
    ).toBe(true);
  });

  it('lets a member pin their own private Agent, which nobody else sees', () => {
    expect(
      canPinContact({ canManageTeamPins: false, inWorkspace: true, visibility: 'private' }),
    ).toBe(true);
  });
});
