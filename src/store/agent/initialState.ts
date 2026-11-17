import { type AgentSliceState } from './slices/agent';
import { initialAgentSliceState } from './slices/agent';
import { type BotSliceState } from './slices/bot';
import { initialBotSliceState } from './slices/bot';
import { type BuiltinAgentSliceState } from './slices/builtin';
import { initialBuiltinAgentSliceState } from './slices/builtin';
import { initialKnowledgeSliceState, type KnowledgeSliceState } from './slices/knowledge';

export type AgentStoreState = AgentSliceState &
  BotSliceState &
  BuiltinAgentSliceState &
  KnowledgeSliceState;

export const initialState: AgentStoreState = {
  ...initialAgentSliceState,
  ...initialBotSliceState,
  ...initialBuiltinAgentSliceState,
  ...initialKnowledgeSliceState,
};
