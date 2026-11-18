import { type UIChatMessage } from '@lobot/types';
import { describe, expect, it } from 'vitest';

import { type ChatStore } from '@/store/chat';
import { initialState } from '@/store/chat/initialState';
import { messageMapKey } from '@/store/chat/utils/messageMapKey';
import { createServerConfigStore } from '@/store/serverConfig/store';
import { merge } from '@/utils/merge';

import { displayMessageSelectors } from './displayMessage';

vi.mock('i18next', () => ({
  t: vi.fn((key) => key), // Simplified mock return value
}));

const initialStore = initialState as ChatStore;

const createMessageFixture = () => [
  {
    id: 'msg1',
    content: 'Hello World',
    role: 'user',
  },
  {
    id: 'msg2',
    content: 'Goodbye World',
    role: 'user',
  },
  {
    id: 'msg3',
    content: 'Function Message',
    role: 'tool',
    tools: [
      {
        arguments: ['arg1', 'arg2'],
        identifier: 'func1',
        apiName: 'ttt',
        type: 'pluginType',
        id: 'abc',
      },
    ],
  },
];

const createDisplayState = (message: UIChatMessage): Partial<ChatStore> => ({
  activeAgentId: 'test-id',
  messagesMap: {
    [messageMapKey({ agentId: 'test-id' })]: [message],
  },
});

const mockMessages = createMessageFixture() as UIChatMessage[];

const mockedChats = createMessageFixture() as UIChatMessage[];

const mockChatStore = {
  messagesMap: {
    [messageMapKey({ agentId: 'abc' })]: mockMessages,
  },
  activeAgentId: 'abc',
} as ChatStore;

beforeAll(() => {
  createServerConfigStore();
});

afterEach(() => {
  const store = createServerConfigStore();
  store.setState((state) => ({
    featureFlags: { ...state.featureFlags, isAgentEditable: true },
  }));
});

describe('displayMessageSelectors', () => {
  describe('getDisplayMessageById', () => {
    it('should return undefined if the message with the given id does not exist', () => {
      const message =
        displayMessageSelectors.getDisplayMessageById('non-existent-id')(initialStore);
      expect(message).toBeUndefined();
    });

    it('should return the message object with the matching id', () => {
      const state = merge(initialStore, {
        messagesMap: {
          [messageMapKey({ agentId: 'abc' })]: mockMessages,
        },
        activeAgentId: 'abc',
      });
      const message = displayMessageSelectors.getDisplayMessageById('msg1')(state);
      expect(message).toEqual(mockedChats[0]);
    });

    it('should return the message with the matching id', () => {
      const message = displayMessageSelectors.getDisplayMessageById('msg1')(mockChatStore);
      expect(message).toEqual(mockedChats[0]);
    });

    it('should return undefined if no message matches the id', () => {
      const message = displayMessageSelectors.getDisplayMessageById('nonexistent')(mockChatStore);
      expect(message).toBeUndefined();
    });
  });

  describe('currentDisplayChatKey', () => {
    it('should generate correct key with activeAgentId only', () => {
      const state: Partial<ChatStore> = {
        activeAgentId: 'testId',
        activeTopicId: undefined,
      };
      const result = displayMessageSelectors.currentDisplayChatKey(state as ChatStore);
      expect(result).toBe(messageMapKey({ agentId: 'testId', topicId: undefined }));
    });

    it('should generate correct key with both activeAgentId and activeTopicId', () => {
      const state: Partial<ChatStore> = {
        activeAgentId: 'testId',
        activeTopicId: 'topicId',
      };
      const result = displayMessageSelectors.currentDisplayChatKey(state as ChatStore);
      expect(result).toBe(messageMapKey({ agentId: 'testId', topicId: 'topicId' }));
    });

    it('should generate key with undefined activeAgentId', () => {
      const state: Partial<ChatStore> = {
        activeAgentId: undefined,
        activeTopicId: 'topicId',
      };
      const result = displayMessageSelectors.currentDisplayChatKey(state as ChatStore);
      expect(result).toBe(messageMapKey({ agentId: undefined as any, topicId: 'topicId' }));
    });

    it('should generate key with empty string activeAgentId', () => {
      const state: Partial<ChatStore> = {
        activeAgentId: '',
        activeTopicId: undefined,
      };
      const result = displayMessageSelectors.currentDisplayChatKey(state as ChatStore);
      expect(result).toBe(messageMapKey({ agentId: '', topicId: undefined }));
    });

    it('should generate correct key with activeGroupId for group conversations', () => {
      const state: Partial<ChatStore> = {
        activeAgentId: 'testId',
        activeGroupId: 'groupId',
        activeTopicId: undefined,
      };
      const result = displayMessageSelectors.currentDisplayChatKey(state as ChatStore);
      expect(result).toBe(
        messageMapKey({ agentId: 'testId', groupId: 'groupId', topicId: undefined }),
      );
    });

    it('should generate correct key with activeGroupId and activeTopicId', () => {
      const state: Partial<ChatStore> = {
        activeAgentId: 'testId',
        activeGroupId: 'groupId',
        activeTopicId: 'topicId',
      };
      const result = displayMessageSelectors.currentDisplayChatKey(state as ChatStore);
      expect(result).toBe(
        messageMapKey({ agentId: 'testId', groupId: 'groupId', topicId: 'topicId' }),
      );
    });

    it('should generate correct key with activeThreadId for thread conversations', () => {
      const state: Partial<ChatStore> = {
        activeAgentId: 'testId',
        activeThreadId: 'threadId',
        activeTopicId: 'topicId',
      };
      const result = displayMessageSelectors.currentDisplayChatKey(state as ChatStore);
      expect(result).toBe('thread_testId_topicId_threadId');
    });
  });

  describe('activeDisplayMessages with group chat messages', () => {
    it('should retrieve agent meta for group chat messages with groupId and agentId', () => {
      const groupChatMessages = [
        {
          id: 'msg1',
          content: 'Hello from agent',
          role: 'assistant',
          groupId: 'group-123',
          agentId: 'agent-456',
        },
      ] as UIChatMessage[];

      const state = merge(initialStore, {
        messagesMap: {
          [messageMapKey({ agentId: 'group-123' })]: groupChatMessages,
        },
        activeAgentId: 'group-123',
      });

      const chats = displayMessageSelectors.activeDisplayMessages(state);
      expect(chats).toHaveLength(1);
      expect(chats[0].id).toBe('msg1');
    });
  });

  describe('findLastMessageId', () => {
    it('should return message id when no children or tools', () => {
      const message = {
        id: 'msg-1',
        role: 'assistant',
        content: 'Simple message',
      } as UIChatMessage;

      const state: Partial<ChatStore> = createDisplayState(message);

      const result = displayMessageSelectors.findLastMessageId('msg-1')(state as ChatStore);
      expect(result).toBe('msg-1');
    });

    it('should find the last child id', () => {
      const groupMessage = {
        id: 'group-1',
        role: 'assistantGroup',
        content: '',
        children: [
          {
            id: 'child-1',
            content: 'First response',
          },
          {
            id: 'child-2',
            content: 'Second response',
          },
        ],
      } as UIChatMessage;

      const state: Partial<ChatStore> = createDisplayState(groupMessage);

      const result = displayMessageSelectors.findLastMessageId('group-1')(state as ChatStore);
      expect(result).toBe('child-2');
    });

    it('should return tool result_msg_id when no children', () => {
      const messageWithTools = {
        id: 'msg-with-tools',
        role: 'assistant',
        content: 'Message with tools',
        tools: [
          {
            id: 'tool-1',
            identifier: 'test',
            apiName: 'test',
            arguments: '{}',
            type: 'default',
            result_msg_id: 'tool-result-1',
          },
          {
            id: 'tool-2',
            identifier: 'test2',
            apiName: 'test2',
            arguments: '{}',
            type: 'default',
            result_msg_id: 'tool-result-2',
          },
        ],
      } as unknown as UIChatMessage;

      const state: Partial<ChatStore> = createDisplayState(messageWithTools);

      const result = displayMessageSelectors.findLastMessageId('msg-with-tools')(
        state as ChatStore,
      );
      expect(result).toBe('tool-result-2');
    });

    it('should prioritize children over tools', () => {
      const message = {
        id: 'msg-1',
        role: 'assistantGroup',
        content: '',
        children: [
          {
            id: 'child-1',
            content: 'Child message',
          },
        ],
        tools: [
          {
            id: 'tool-1',
            identifier: 'test',
            apiName: 'test',
            arguments: '{}',
            type: 'default',
            result_msg_id: 'tool-result-1',
          },
        ],
      } as unknown as UIChatMessage;

      const state: Partial<ChatStore> = createDisplayState(message);

      const result = displayMessageSelectors.findLastMessageId('msg-1')(state as ChatStore);
      expect(result).toBe('child-1');
    });

    it('should return undefined for non-existent message', () => {
      const state: Partial<ChatStore> = {
        activeAgentId: 'test-id',
        messagesMap: {
          [messageMapKey({ agentId: 'test-id' })]: [],
        },
      };

      const result = displayMessageSelectors.findLastMessageId('non-existent')(state as ChatStore);
      expect(result).toBeUndefined();
    });

    it('should return last child id even when the child has tools', () => {
      const messageWithChildrenAndTools = {
        id: 'msg-1',
        role: 'assistantGroup',
        content: '',
        children: [
          {
            id: 'child-1',
            content: 'First child',
          },
          {
            id: 'child-2',
            content: 'Second child with tools',
            tools: [
              {
                id: 'tool-1',
                identifier: 'test',
                apiName: 'test',
                arguments: '{}',
                type: 'default',
                result_msg_id: 'tool-result-id',
              },
            ],
          },
        ],
      } as unknown as UIChatMessage;

      const state: Partial<ChatStore> = createDisplayState(messageWithChildrenAndTools);

      const result = displayMessageSelectors.findLastMessageId('msg-1')(state as ChatStore);
      expect(result).toBe('child-2');
    });

    it('should not use an internal tool result as the parent for a new user message', () => {
      // ROOT CAUSE:
      //
      // When the visible last message is an assistantGroup and its last block has
      // tools, findLastMessageId returns the tool result id. sendMessage then
      // stores the new user message with parentId=<tool-result-id>, which makes
      // normal user turns siblings under a tool message instead of continuing
      // the conversational chain.
      //
      // Before patch:
      // assistantGroup -> last block -> internal tool result
      // new user message parentId = tool result id
      //
      // Expected behavior:
      // new user message parentId = the visible conversational block id
      const assistantGroup = {
        id: 'assistant-group-1',
        role: 'assistantGroup',
        content: '',
        children: [
          {
            id: 'assistant-block-1',
            content: 'I will run an internal tool.',
          },
          {
            id: 'assistant-block-2',
            content: 'Internal tool completed.',
            tools: [
              {
                id: 'internal-tool-call',
                identifier: 'test-runner',
                apiName: 'internal_update',
                arguments: '{}',
                type: 'default',
                result_msg_id: 'internal-tool-result-message',
              },
            ],
          },
        ],
      } as unknown as UIChatMessage;

      const state: Partial<ChatStore> = createDisplayState(assistantGroup);

      const result = displayMessageSelectors.findLastMessageId('assistant-group-1')(
        state as ChatStore,
      );

      expect(result).toBe('assistant-block-2');
    });

    it('should return lastMessageId for compressedGroup instead of group id', () => {
      const compressedGroupMessage = {
        id: 'mg_123456',
        role: 'compressedGroup',
        content: 'Compressed summary',
        lastMessageId: 'msg-999',
        compressedMessages: [],
        pinnedMessages: [],
      } as unknown as UIChatMessage;

      const state: Partial<ChatStore> = createDisplayState(compressedGroupMessage);

      const result = displayMessageSelectors.findLastMessageId('mg_123456')(state as ChatStore);
      expect(result).toBe('msg-999');
    });
  });
});
