import { lambdaClient } from '@/libs/trpc/client';
import type { AgentSignalSourceEventInput, AgentSignalSourceType } from '@/types/agentSignal';

type ClientGatewaySourceType = Extract<AgentSignalSourceType, `client.${string}`>;

type ClientGatewaySourceEventInput<TSourceType extends ClientGatewaySourceType> =
  AgentSignalSourceEventInput<TSourceType>;

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
