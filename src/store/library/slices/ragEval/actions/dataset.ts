import { type KnowledgeBaseStore } from '@/store/library/store';
import { type StoreSetter } from '@/store/types';

type Setter = StoreSetter<KnowledgeBaseStore>;
export const createRagEvalDatasetSlice = (
  set: Setter,
  get: () => KnowledgeBaseStore,
  _api?: unknown,
) => new RAGEvalDatasetActionImpl(set, get, _api);

class RAGEvalDatasetActionImpl {
  constructor(set: Setter, get: () => KnowledgeBaseStore, _api?: unknown) {
    void _api;
  }
}

export type RAGEvalDatasetAction = Pick<RAGEvalDatasetActionImpl, keyof RAGEvalDatasetActionImpl>;
