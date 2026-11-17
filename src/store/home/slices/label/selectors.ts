import { type AgentLabelListItem } from '@lobot/types';

import { type HomeStoreState } from '@/store/home/initialState';

const allLabels = (s: HomeStoreState): AgentLabelListItem[] => s.agentLabels;

const isLabelsInit = (s: HomeStoreState): boolean => s.isAgentLabelsInit;

export const agentLabelSelectors = {
  allLabels,
  isLabelsInit,
};
