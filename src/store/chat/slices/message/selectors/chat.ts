/**
 * Chat Selectors - Backward Compatibility Layer
 *
 * This file provides backward compatibility by re-exporting selectors from:
 * - dbMessage.ts: Raw database message selectors (for data operations)
 * - displayMessage.ts: Display message selectors (for UI rendering)
 *
 * MIGRATION GUIDE:
 * ================
 *
 * For Data Operations (create, update, delete):
 * ----------------------------------------------
 * Use dbMessageSelectors from './dbMessage'
 *
 * Before: chatSelectors.getMessageById(id)(state)
 * After:  dbMessageSelectors.getDbMessageById(id)(state)
 *
 * Before: chatSelectors.latestMessage(state)
 * After:  dbMessageSelectors.latestDbMessage(state)
 *
 * Before: chatSelectors.currentToolMessages(state)
 * After:  dbMessageSelectors.dbToolMessages(state)
 *
 * For UI Rendering:
 * -----------------
 * Use displayMessageSelectors from './displayMessage'
 *
 * Before: chatSelectors.mainDisplayChats(state)
 * After:  displayMessageSelectors.mainDisplayChats(state)
 *
 * Before: chatSelectors.getMessageById(id)(state)  // For display
 * After:  displayMessageSelectors.getDisplayMessageById(id)(state)
 */
import { type ChatFileItem } from '@lobot/types';

import { type ChatStoreState } from '../../../initialState';
import { dbMessageSelectors } from './dbMessage';
import { displayMessageSelectors } from './displayMessage';

// Re-export new selector groups
export { dbMessageSelectors } from './dbMessage';
export { displayMessageSelectors } from './displayMessage';

// ============= Backward Compatibility Exports ========== //
// These maintain the old API for gradual migration
// Prefer using dbMessageSelectors or displayMessageSelectors directly

/**
 * Legacy chatSelectors object for backward compatibility
 * @deprecated Import dbMessageSelectors or displayMessageSelectors directly
 */
export const chatSelectors = {
  // Display message selectors (from messagesMap)
  activeBaseChats: displayMessageSelectors.activeDisplayMessages,

  currentChatKey: displayMessageSelectors.currentDisplayChatKey,

  currentToolMessages: dbMessageSelectors.dbToolMessages,

  currentUserFiles: (s: ChatStoreState) =>
    dbMessageSelectors.dbUserFiles(s) as unknown as ChatFileItem[],

  getBaseChatsByKey: displayMessageSelectors.getDisplayMessagesByKey,

  getMessageById: displayMessageSelectors.getDisplayMessageById,

  isCurrentChatLoaded: displayMessageSelectors.isCurrentDisplayChatLoaded,
  mainDisplayChats: displayMessageSelectors.mainDisplayChats,
};
