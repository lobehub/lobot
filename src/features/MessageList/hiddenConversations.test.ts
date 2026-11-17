import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import {
  hideConversation,
  showConversation,
  useHiddenConversations,
  useHiddenConversationStore,
} from './hiddenConversations';

describe('hiddenConversations', () => {
  beforeEach(() => {
    useHiddenConversationStore.setState({ hiddenAt: {} });
  });

  it('records when a row was hidden and forgets it once shown again', () => {
    const { result } = renderHook(() => useHiddenConversations());

    act(() => hideConversation('agt_a', 1000));
    expect(result.current.get('agt_a')).toBe(1000);

    act(() => showConversation('agt_a'));
    expect(result.current.has('agt_a')).toBe(false);
  });
});
