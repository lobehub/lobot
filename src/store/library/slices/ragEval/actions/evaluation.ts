import { type CreateNewEvalEvaluation, type RAGEvalDataSetItem } from '@lobot/types';
import { type SWRResponse } from 'swr';

import { mutate, useClientDataSWR } from '@/libs/swr';
import { ragEvalKeys } from '@/libs/swr/keys';
import { ragEvalService } from '@/services/ragEval';
import { type KnowledgeBaseStore } from '@/store/library/store';
import { type StoreSetter } from '@/store/types';

type Setter = StoreSetter<KnowledgeBaseStore>;
export const createRagEvalEvaluationSlice = (
  set: Setter,
  get: () => KnowledgeBaseStore,
  _api?: unknown,
) => new RAGEvalEvaluationActionImpl(set, get, _api);

class RAGEvalEvaluationActionImpl {
  constructor(set: Setter, get: () => KnowledgeBaseStore, _api?: unknown) {
    void _api;
  }
}

export type RAGEvalEvaluationAction = Pick<
  RAGEvalEvaluationActionImpl,
  keyof RAGEvalEvaluationActionImpl
>;
