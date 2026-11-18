import { afterEach, describe, expect, it, vi } from 'vitest';

import { waitForPageSynced } from './collabRegistry';

describe('waitForPageSynced', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('resolves immediately when the page has no live room', async () => {
    expect(await waitForPageSynced('doc_unknown', 1000)).toBe(true);
  });
});
