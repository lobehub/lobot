import { vi } from 'vitest';

import { useChatStore } from '../../../../store';
import { TEST_IDS } from './fixtures';

/**
 * Reset all mocks and store state to clean state
 */
export const resetTestEnvironment = () => {
  vi.clearAllMocks();
  useChatStore.setState(
    {
      activeAgentId: TEST_IDS.SESSION_ID,
      activeTopicId: TEST_IDS.TOPIC_ID,
      messagesMap: {},
      toolCallingStreamIds: {},
    },
    false,
  );
};
