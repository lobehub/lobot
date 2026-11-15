import { describe, expect, it } from 'vitest';

import { filterChatOnlyActions } from './filterChatOnlyActions';

describe('filterChatOnlyActions', () => {
  it('keeps formatting and dictation while hiding the remaining actions', () => {
    expect(
      filterChatOnlyActions(['voiceMessage', 'voiceDictation', '---', ['typo', 'voiceMessage']]),
    ).toEqual(['voiceDictation', '---', ['typo']]);
  });

  it('drops a group that has no chat-only action left', () => {
    expect(filterChatOnlyActions([['voiceMessage'], 'typo'])).toEqual(['typo']);
  });
});
