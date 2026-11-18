import { lambdaClient } from '@/libs/trpc/client';
import { invalidateDocumentMutation } from '@/services/document/invalidation';
import { type AgentContextDocument } from '@/types/agentContext';
import { toAgentContextDocuments } from '@/utils/agentDocumentContextMapping';

interface AgentDocumentToolContext {
  messageId: string;
  operationId?: string;
  rootOperationId?: string;
  taskId?: string | null;
  threadId?: string | null;
  toolCallId: string;
  toolMessageId?: string;
  topicId?: string;
}

interface AgentDocumentToolTriggerInput {
  toolContext?: AgentDocumentToolContext;
  trigger?: 'tool';
}

class AgentDocumentService {
  getContextDocuments = async (params: { agentId: string }) => {
    return lambdaClient.agentDocument.getContextDocuments.query(params);
  };

  listDocuments = async (params: {
    agentId: string;
    excludeWeb?: boolean;
    includeArchivedToolResults?: boolean;
    parentId?: string;
    scope?: 'agent' | 'currentTopic';
    sourceType?: 'all' | 'file' | 'web';
    topicId?: string;
    withChildCount?: boolean;
  }) => {
    return lambdaClient.agentDocument.listDocuments.query(params);
  };

  getOrCreateChatTopic = async (params: { agentId: string; documentId: string }) => {
    return lambdaClient.agentDocument.getOrCreateChatTopic.mutate(params);
  };

  getReaderDocument = async (params: { agentId: string; documentId: string }) => {
    return lambdaClient.agentDocument.getReaderDocument.query(params);
  };

  removeDocument = async (
    params: {
      agentId: string;
      documentId?: string;
      id: string;
      topicId?: string;
      /** Also delete documents nested under it; a parent with children is refused otherwise. */
      withChildren?: boolean;
    } & AgentDocumentToolTriggerInput,
  ) => {
    const { agentId, documentId, id, topicId, toolContext, trigger, withChildren } = params;
    const result = await lambdaClient.agentDocument.removeDocument.mutate({
      agentId,
      id,
      toolContext,
      trigger,
      withChildren,
    });
    await invalidateDocumentMutation({
      agentId,
      cause: 'agent-document',
      documentId,
      topicId,
    });

    return result;
  };
}

export const resolveAgentDocumentsContext = async (params: {
  agentId?: string;
  cachedDocuments?: AgentContextDocument[];
}) => {
  const { agentId, cachedDocuments } = params;

  if (cachedDocuments !== undefined) return cachedDocuments;
  if (!agentId) return undefined;

  const documents = await agentDocumentService.getContextDocuments({ agentId });

  return toAgentContextDocuments(documents);
};

export const agentDocumentService = new AgentDocumentService();

export type AgentDocumentListItem = Awaited<
  ReturnType<typeof agentDocumentService.listDocuments>
>[number];
