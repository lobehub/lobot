import { describe, expect, it, vi } from 'vitest';

import { contactCardPreview, localizeCardFallback } from './cardText';

vi.mock('i18next', () => ({
  t: (key: string, options: { name: string }) =>
    `${key === 'contactCard.preview.agent' ? '[Agent 名片]' : '[名片]'} ${options.name}`,
}));

describe('contact card text', () => {
  it('previews a card in the viewer language', () => {
    expect(contactCardPreview({ name: 'Writer', type: 'agent' })).toBe('[Agent 名片] Writer');
    expect(contactCardPreview({ name: 'Max', type: 'user' })).toBe('[名片] Max');
  });

  it('localizes the stored English text and leaves other text alone', () => {
    expect(localizeCardFallback('[Agent card] Writer')).toBe('[Agent 名片] Writer');
    expect(localizeCardFallback('[Contact card] Max')).toBe('[名片] Max');
    expect(localizeCardFallback('hello')).toBe('hello');
  });
});
