import type { TaskLabelWithUsage } from '@lobot/types';

import type { TaskStoreState } from '../initialState';

const EMPTY: TaskLabelWithUsage[] = [];

const labels = (s: TaskStoreState) => (s.taskLabelsInit ? s.taskLabels : EMPTY);
const isLabelsInit = (s: TaskStoreState) => s.taskLabelsInit;

export const taskLabelSelectors = {
  isLabelsInit,
  labels,
};
