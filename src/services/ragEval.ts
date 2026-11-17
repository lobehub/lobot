import {
  type CreateNewEvalDatasets,
  type CreateNewEvalEvaluation,
  type EvalDatasetRecord,
  type insertEvalDatasetsSchema,
  type RAGEvalDataSetItem,
  type RAGEvalEvaluationItem,
} from '@lobot/types';

import { lambdaClient } from '@/libs/trpc/client';
import { uploadService } from '@/services/upload';

class RAGEvalService {}

export const ragEvalService = new RAGEvalService();
