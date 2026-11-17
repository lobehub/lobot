import { describe, expect, it } from 'vitest';

import { highlightParts } from './ChannelSearch';

describe('highlightParts', () => {
  it('marks every query word in any case, literally', () => {
    expect(highlightParts('Ship the Search box; search a.b', 'search a.b')).toEqual([
      { match: false, text: 'Ship the ' },
      { match: true, text: 'Search' },
      { match: false, text: ' box; ' },
      { match: true, text: 'search' },
      { match: false, text: ' ' },
      { match: true, text: 'a.b' },
    ]);
  });

  it('leaves text without a query whole', () => {
    expect(highlightParts('hello', '  ')).toEqual([{ match: false, text: 'hello' }]);
  });
});
