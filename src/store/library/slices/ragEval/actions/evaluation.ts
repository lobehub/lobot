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
