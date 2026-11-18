import { type UIChatMessage } from '@lobot/types';

// Test Constants
export const TEST_IDS = {
  ASSISTANT_MESSAGE_ID: 'test-assistant-message-id',
  FILE_ID: 'test-file-id',
  MESSAGE_ID: 'test-message-id',
  NEW_MESSAGE_ID: 'new-message-id',
  NEW_TOPIC_ID: 'new-topic-id',
  SESSION_ID: 'test-session-id',
  TOPIC_ID: 'test-topic-id',
  USER_MESSAGE_ID: 'test-user-message-id',
} as const;

const TEST_CONTENT = {
  AI_RESPONSE: 'Test AI response',
  EMPTY: '',
  RAG_QUERY: 'Test RAG query',
  USER_MESSAGE: 'Test user message',
} as const;

// Mock Data Factories
export const createMockMessage = (overrides: Partial<UIChatMessage> = {}): UIChatMessage => {
  const base: any = {
    content: TEST_CONTENT.USER_MESSAGE,
    createdAt: Date.now(),
    id: TEST_IDS.MESSAGE_ID,
    role: 'user',
    sessionId: TEST_IDS.SESSION_ID,
    topicId: TEST_IDS.TOPIC_ID,
    updatedAt: Date.now(),
  };

  // Merge overrides, preserving all provided properties
  return { ...base, ...overrides } as UIChatMessage;
};
