import {
  type AsyncTaskStatus,
  type IAsyncTaskError,
  type UserMemoryExtractionMetadata,
} from '@lobot/types';

import { lambdaClient } from '@/libs/trpc/client';

interface MemoryExtractionTask {
  error?: IAsyncTaskError | null;
  id: string;
  metadata: UserMemoryExtractionMetadata;
  status: AsyncTaskStatus;
}

interface RequestMemoryExtractionParams {
  fromDate?: Date;
  toDate?: Date;
}

interface RequestMemoryExtractionResult extends MemoryExtractionTask {
  deduped: boolean;
}

class MemoryExtractionService {}

export const memoryExtractionService = new MemoryExtractionService();
