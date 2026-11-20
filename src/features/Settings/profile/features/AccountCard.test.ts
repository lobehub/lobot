import { describe, expect, it } from 'vitest';

import { formatAccountUserId } from './accountUserId';

describe('formatAccountUserId', () => {
  it('shows the user id as @username under the name', () => {
    expect(formatAccountUserId(true, 'canisminor')).toBe('@canisminor');
  });

  it('shows nothing when the signed-in account has no username', () => {
    expect(formatAccountUserId(true, undefined)).toBe('');
    expect(formatAccountUserId(true, null)).toBe('');
  });

  it('shows nothing before sign-in', () => {
    expect(formatAccountUserId(false, 'anonymous')).toBe('');
  });
});
