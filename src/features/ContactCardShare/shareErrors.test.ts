import { describe, expect, it } from 'vitest';

import { shareAgentErrorKey } from './shareErrors';

describe('shareAgentErrorKey', () => {
  it('asks the owner to turn on the share link first', () => {
    expect(shareAgentErrorKey({ data: { code: 'PRECONDITION_FAILED' } })).toBe(
      'contactCard.error.agentNotShared',
    );
  });

  it('says an Agent that is no longer shared cannot be shared', () => {
    expect(shareAgentErrorKey({ data: { code: 'NOT_FOUND' } })).toBe(
      'contactCard.error.unavailable',
    );
  });

  it('falls back to a retry message', () => {
    expect(shareAgentErrorKey(new Error('offline'))).toBe('contactCard.error.failed');
    expect(shareAgentErrorKey(undefined)).toBe('contactCard.error.failed');
  });
});
