import type { TaskLabelWithUsage } from '@lobot/types';

import { lambdaClient } from '@/libs/trpc/client';

export interface TaskLabelInput {
  color?: string | null;
  description?: string | null;
  isGroup?: boolean;
  name: string;
  parentId?: string | null;
}

class TaskLabelService {
  list = (): Promise<TaskLabelWithUsage[]> => lambdaClient.taskLabel.list.query();

  create = (params: TaskLabelInput) => lambdaClient.taskLabel.create.mutate(params);
}

export const taskLabelService = new TaskLabelService();
