import { type ConversationContext as BaseConversationContext } from '@lobot/types';

/**
 * Extended Conversation Context
 *
 * Extends the base ConversationContext with optional metadata.
 * Used to locate messages in the session → topic → thread hierarchy.
 *
 * Design Principles:
 * - ❌ No `mode` field (avoid hardcoded types)
 * - ✅ Only data coordinates (sessionId/topicId/threadId)
 * - ✅ Scenario is naturally determined by coordinate combination
 */
export interface ConversationContext extends BaseConversationContext {
  /**
   * Metadata (optional, for extension)
   *
   * Can be used to store additional context-specific data:
   * - knowledgeBaseId: For knowledge base chat
   * - agentId: For agent preview chat
   * - preview: Boolean flag for preview mode
   * - etc.
   */
  metadata?: Record<string, any>;
}
