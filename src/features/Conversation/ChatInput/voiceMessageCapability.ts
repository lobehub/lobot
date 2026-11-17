import type { ConversationContext } from '@lobot/types';

import { getAgentStoreState, useAgentStore } from '@/store/agent';
import { agentByIdSelectors } from '@/store/agent/selectors';
import { getUserStoreState, useUserStore } from '@/store/user';
import { systemAgentSelectors } from '@/store/user/selectors';

/**
 * Heterogeneous agents take text only: their voice turns are transcribed before sending, so the
 * recorder depends on a configured speech-to-text model.
 */
export const isVoiceMessageTranscribed = (context: ConversationContext) =>
  agentByIdSelectors.isAgentHeterogeneousById(context.agentId)(getAgentStoreState());

export const canSendVoiceMessage = (context: ConversationContext) =>
  isVoiceMessageTranscribed(context) && systemAgentSelectors.isAsrConfigured(getUserStoreState());

export const useCanSendVoiceMessage = (context: ConversationContext) => {
  const isTranscribed = useAgentStore(agentByIdSelectors.isAgentHeterogeneousById(context.agentId));
  const isAsrConfigured = useUserStore(systemAgentSelectors.isAsrConfigured);

  return isTranscribed && isAsrConfigured;
};
