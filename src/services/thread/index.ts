import { type CreateMessageParams } from '@lobot/types';

import { INBOX_SESSION_ID } from '@/const/session';
import { lambdaClient } from '@/libs/trpc/client';
import { type CreateThreadParams, type ThreadItem } from '@/types/topic';

interface CreateThreadWithMessageParams extends CreateThreadParams {
  message: CreateMessageParams;
}

export class ThreadService {
  getThreads = (topicId: string): Promise<ThreadItem[]> => {
    return lambdaClient.thread.getThreads.query({ topicId });
  };

  updateThread = async (id: string, data: Partial<ThreadItem>) => {
    return lambdaClient.thread.updateThread.mutate({ id, value: data });
  };

  removeThread = async (id: string) => {
    return lambdaClient.thread.removeThread.mutate({ id });
  };
}

export const threadService = new ThreadService();
