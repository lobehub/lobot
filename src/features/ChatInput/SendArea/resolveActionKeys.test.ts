import { describe, expect, it } from 'vitest';

import { resolveSendAreaActionKeys } from './resolveActionKeys';

describe('resolveSendAreaActionKeys', () => {
  it('keeps the configured right actions', () => {
    expect(resolveSendAreaActionKeys(['voiceMessage', 'typo'])).toEqual(['voiceMessage', 'typo']);
  });

  it('omits an active audio control when its action belongs to another region', () => {
    expect(resolveSendAreaActionKeys(['voiceMessage'], 'dictation')).toEqual([]);
    expect(resolveSendAreaActionKeys(['voiceMessage'], 'voiceMessage')).toEqual(['voiceMessage']);
  });

  it('handles undefined rightActions', () => {
    expect(resolveSendAreaActionKeys(undefined)).toEqual([]);
  });
});
