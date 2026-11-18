import { type StepContextTodos, type UIChatMessage } from '@lobot/types';

import { chatHelpers } from '../../../helpers';
import { type ChatStoreState } from '../../../initialState';
import { messageMapKey } from '../../../utils/messageMapKey';
import { extractTodosFromMessages } from './messageExtractors';

/**
 * DB Message Selectors
 *
 * These selectors access raw messages from dbMessagesMap (database source).
 * Use these selectors when you need to:
 * - Operate on raw message data (create, update, delete)
 * - Access original message structure before processing
 * - Perform data mutations or service calls
 *
 * DO NOT use these for UI rendering - use displayMessage.ts selectors instead.
 */

// ============= Basic DB Message Access ========== //

/**
 * Get the current chat key for accessing dbMessagesMap
 */
const currentDbChatKey = (s: ChatStoreState) =>
  messageMapKey({
    agentId: s.activeAgentId,
    groupId: s.activeGroupId,
    threadId: s.activeThreadId,
    topicId: s.activeTopicId,
  });

/**
 * Get raw messages from database by key
 */
const getDbMessagesByKey =
  (key: string) =>
  (s: ChatStoreState): UIChatMessage[] => {
    return s.dbMessagesMap[key] || [];
  };

/**
 * Get current active agent's raw messages from database
 */
const activeDbMessages = (s: ChatStoreState): UIChatMessage[] => {
  if (!s.activeAgentId) return [];
  return getDbMessagesByKey(currentDbChatKey(s))(s);
};

// ============= DB Message Queries ========== //

/**
 * Get raw message by ID from database (searches globally across all sessions/topics)
 * This is essential for parallel topic agent runtime where background updates
 * may occur after the user has switched to another chat.
 */
const getDbMessageById = (id: string) => (s: ChatStoreState) => {
  // Search across all messages in dbMessagesMap
  for (const messages of Object.values(s.dbMessagesMap)) {
    const message = chatHelpers.getMessageById(messages, id);
    if (message) return message;
  }
  return undefined;
};

/**
 * Get raw message by tool_call_id from database
 */
export const getDbMessageByToolCallId = (id: string) => (s: ChatStoreState) => {
  const messages = activeDbMessages(s);
  return messages.find((m) => m.tool_call_id === id);
};

// ============= DB Message Filtering ========== //

/**
 * Get all tool messages from database
 */
const dbToolMessages = (s: ChatStoreState) => {
  const messages = activeDbMessages(s);
  return messages.filter((m) => m.role === 'tool');
};

/**
 * Get all user messages from database
 */
const dbUserMessages = (s: ChatStoreState) => {
  const messages = activeDbMessages(s);
  return messages.filter((m) => m.role === 'user');
};

/**
 * Get all file attachments from user messages.
 *
 * Tombstoned entries (the viewer lost access to the file — empty
 * name/type/url) are excluded: list/preview consumers have nothing to render
 * or open for them; only the message bubble shows a no-access placeholder.
 */
const dbUserFiles = (s: ChatStoreState) => {
  const userMessages = dbUserMessages(s);
  return userMessages
    .filter((m) => m.fileList && m.fileList.length > 0)
    .flatMap((m) => m.fileList)
    .filter((f) => !!f && !f.inaccessible);
};

// ============= Todos Selectors ========== //

/**
 * Select the latest todos state from messages array
 *
 * Searches messages in reverse order to find the most recent tool message
 * that carries a `pluginState.todos` payload — regardless of which tool
 * produced it. `pluginState.todos` is treated as a shared contract: lobe-agent
 * writes it via its client state mutation, and heterogeneous agent adapters
 * (Claude Code TodoWrite, future ACP/Codex equivalents) synthesize it onto
 * the tool_result event. Any new producer that honors the shape gets picked
 * up automatically.
 *
 * This is a pure function that can be used for both:
 * - UI display (showing current todos)
 * - Agent runtime step context computation
 *
 * @param messages - Array of chat messages to search
 * @returns The latest todos state or undefined if not found
 */
export const selectTodosFromMessages = (messages: UIChatMessage[]): StepContextTodos | undefined =>
  extractTodosFromMessages(messages);

/**
 * Select todos from the current agent turn only — messages after the last
 * user message. Intended for UI surfaces that should drop a stale/completed
 * todos snapshot the moment a new user turn begins. If no user message exists
 * yet (e.g. initial agent greeting), falls back to the full history.
 *
 * Do NOT use this for agent runtime step context — the runtime must see todos
 * across turns so the agent remembers its plan between user messages.
 */
export const selectCurrentTurnTodosFromMessages = (
  messages: UIChatMessage[],
): StepContextTodos | undefined => {
  let lastUserIndex = -1;
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === 'user') {
      lastUserIndex = i;
      break;
    }
  }
  const scope = lastUserIndex >= 0 ? messages.slice(lastUserIndex + 1) : messages;
  return selectTodosFromMessages(scope);
};

export const dbMessageSelectors = {
  activeDbMessages,
  currentDbChatKey,
  dbToolMessages,
  dbUserFiles,
  dbUserMessages,
  getDbMessageById,
  getDbMessageByToolCallId,
  getDbMessagesByKey,
  selectCurrentTurnTodosFromMessages,
  selectTodosFromMessages,
};
