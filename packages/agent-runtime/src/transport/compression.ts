import type { OpenAIChatMessage, UIChatMessage } from '@lobechat/types';

interface CompressionGroupCreateInput {
  agentId?: string;
  groupId?: string;
  messageIds: string[];
  threadId?: string;
  topicId: string;
  workspaceId?: string;
}

interface CompressionGroupCreateResult {
  messageGroupId: string;
  messages?: UIChatMessage[];
  messagesToSummarize: UIChatMessage[];
  signal?: AbortSignal;
}

interface CompressionPromptInput {
  existingSummary?: string;
  messages: UIChatMessage[];
}

interface CompressionPromptResult {
  messages: OpenAIChatMessage[];
}

interface CompressionGroupFinalizeInput {
  agentId?: string;
  content: string;
  groupId?: string;
  messageGroupId: string;
  sourceGroupIds?: string[];
  threadId?: string;
  topicId: string;
  workspaceId?: string;
}

interface CompressionGroupFinalizeResult {
  messages?: UIChatMessage[];
}

interface CompressionGroupUpdateInput {
  content: string;
  messageGroupId: string;
}

interface CompressionGroupRollbackInput {
  agentId?: string;
  error: unknown;
  groupId?: string;
  messageGroupId: string;
  threadId?: string;
  topicId: string;
  workspaceId?: string;
}

interface CompressionGroupRollbackResult {
  messages?: UIChatMessage[];
}

/**
 * Persistence + prompt-preparation port for context compression.
 *
 * Compression is not just an LLM call: it creates a visible compressed-message
 * group, summarizes the grouped messages, then finalizes the group content.
 * Keeping those steps behind this transport lets package executors stay free of
 * database services and prompt-package dependencies.
 */
export interface CompressionTransport {
  buildPrompt: (input: CompressionPromptInput) => Promise<CompressionPromptResult>;
  createGroup: (input: CompressionGroupCreateInput) => Promise<CompressionGroupCreateResult>;
  finalizeGroup: (input: CompressionGroupFinalizeInput) => Promise<CompressionGroupFinalizeResult>;
  rollbackGroup?: (input: CompressionGroupRollbackInput) => Promise<CompressionGroupRollbackResult>;
  updateGroup?: (input: CompressionGroupUpdateInput) => void;
}
