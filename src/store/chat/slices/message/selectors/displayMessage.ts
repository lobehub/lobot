import { type AssistantContentBlock, type UIChatMessage } from '@lobot/types';

import { chatHelpers } from '../../../helpers';
import { type ChatStoreState } from '../../../initialState';
import { messageMapKey } from '../../../utils/messageMapKey';

/**
 * Display Message Selectors
 *
 * These selectors access processed messages from messagesMap (parsed display data).
 * Use these selectors when you need to:
 * - Render messages in UI components
 * - Display assistantGroup messages with children
 * - Present message history with filters
 *
 * DO NOT use these for data mutations - use dbMessage.ts selectors instead.
 */

// ============= Basic Display Message Access ========== //

/**
 * Get the current chat key for accessing messagesMap
 * For group conversations, uses groupId to generate the correct key
 */
const currentDisplayChatKey = (s: ChatStoreState) =>
  messageMapKey({
    agentId: s.activeAgentId,
    groupId: s.activeGroupId,
    threadId: s.activeThreadId,
    topicId: s.activeTopicId,
  });

/**
 * Get display messages by key
 */
const getDisplayMessagesByKey =
  (key: string) =>
  (s: ChatStoreState): UIChatMessage[] => {
    return s.messagesMap[key] || [];
  };

/**
 * Get current active agent's display messages (includes assistantGroup messages)
 */
const activeDisplayMessages = (s: ChatStoreState): UIChatMessage[] => {
  if (!s.activeAgentId) return [];
  return getDisplayMessagesByKey(currentDisplayChatKey(s))(s);
};

// ============= Display Message Queries ========== //

/**
 * Get display message by ID (searches in messagesMap including assistantGroup children)
 */
export const getDisplayMessageById = (id: string) => (s: ChatStoreState) =>
  chatHelpers.getMessageById(activeDisplayMessages(s), id);

const lastDisplayMessageId = (s: ChatStoreState) => {
  const messages = activeDisplayMessages(s);
  if (messages.length === 0) return undefined;
  return messages.at(-1)?.id;
};

// ============= Thread Handling ========== //

const getChatsWithThread = (s: ChatStoreState, messages: UIChatMessage[]) => {
  // If there is no activeThreadId, return all top-level messages
  if (!s.activeThreadId) return messages.filter((m) => !m.threadId);

  const thread = s.threadMaps[s.activeTopicId!]?.find((t) => t.id === s.activeThreadId);

  if (!thread) return messages.filter((m) => !m.threadId);

  const sourceIndex = messages.findIndex((m) => m.id === thread.sourceMessageId);
  const sliced = messages.slice(0, sourceIndex + 1);

  return [...sliced, ...messages.filter((m) => m.threadId === s.activeThreadId)];
};

// ============= Main Display Chats ========== //

/**
 * Main display chats for UI rendering (without tool messages, with thread handling)
 */
const mainDisplayChats = (s: ChatStoreState): UIChatMessage[] => {
  const displayChats = activeDisplayMessages(s);
  return getChatsWithThread(s, displayChats);
};

/**
 * Check if current chat is loaded in messagesMap
 */
const isCurrentDisplayChatLoaded = (s: ChatStoreState) => !!s.messagesMap[currentDisplayChatKey(s)];

/**
 * Helper to find last message ID in an AssistantContentBlock
 */
const findLastBlockId = (block: AssistantContentBlock | undefined): string | undefined => {
  if (!block) return undefined;

  return block.id;
};

/**
 * Recursively finds the last message ID in a message tree
 * Priority: children > tools > compressedGroup.lastMessageId > self
 */
const findLastMessageIdRecursive = (node: UIChatMessage | undefined): string | undefined => {
  if (!node) return undefined;

  // Priority 1: Dive into children recursively
  if (node.children && node.children.length > 0) {
    const lastChild = node.children.at(-1);
    return findLastBlockId(lastChild);
  }

  // Priority 2: Check tools for result message ID
  if (node.tools && node.tools.length > 0) {
    const lastTool = node.tools.at(-1);
    return lastTool?.result_msg_id;
  }

  // Priority 3: For compressedGroup, return lastMessageId instead of group ID
  if (node.role === 'compressedGroup' && 'lastMessageId' in node) {
    return (node as any).lastMessageId;
  }

  // Priority 4: Return self ID
  return node.id;
};

/**
 * Finds the last (deepest) message ID from a display message
 * Recursively traverses children and tools to find the actual last message
 */
const findLastMessageId = (id: string) => (s: ChatStoreState) => {
  const message = getDisplayMessageById(id)(s);
  return findLastMessageIdRecursive(message);
};

export const displayMessageSelectors = {
  activeDisplayMessages,
  currentDisplayChatKey,
  findLastMessageId,
  getDisplayMessageById,
  getDisplayMessagesByKey,
  isCurrentDisplayChatLoaded,
  lastDisplayMessageId,
  mainDisplayChats,
};
