import { lambdaClient } from '@/libs/trpc/client';
import type { AgentSignalSourceEventInput, AgentSignalSourceType } from '@/types/agentSignal';

type ClientGatewaySourceType = Extract<AgentSignalSourceType, `client.${string}`>;

type ClientGatewaySourceEventInput<TSourceType extends ClientGatewaySourceType> =
  AgentSignalSourceEventInput<TSourceType>;

export interface ListAgentSignalReceiptsParams {
  agentId: string;
  cursor?: number;
  limit?: number;
  sinceCreatedAt?: number;
  topicId: string;
}

export interface RollbackAgentSignalReceiptParams {
  agentDocumentId?: string;
  /** Skill receipts only. */
  documentId?: string;
  /** Skill receipts only. */
  historyId?: string;
  receiptId: string;
}

class AgentSignalService {
  emitSourceEvent = async (payload: ClientGatewaySourceEventInput<ClientGatewaySourceType>) => {
    return lambdaClient.agentSignal.emitSourceEvent.mutate(payload);
  };

  emitClientGatewaySourceEvent = async <TSourceType extends ClientGatewaySourceType>(
    payload: ClientGatewaySourceEventInput<TSourceType>,
  ) => {
    return this.emitSourceEvent({
      ...payload,
      timestamp: payload.timestamp ?? Date.now(),
    });
  };
}

export const agentSignalService = new AgentSignalService();
