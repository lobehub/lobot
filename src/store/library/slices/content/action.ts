import { type KnowledgeBaseStore } from '@/store/library/store';
import { type StoreSetter } from '@/store/types';

type Setter = StoreSetter<KnowledgeBaseStore>;
export const createContentSlice = (set: Setter, get: () => KnowledgeBaseStore, _api?: unknown) =>
  new KnowledgeBaseContentActionImpl(set, get, _api);

class KnowledgeBaseContentActionImpl {
  constructor(set: Setter, get: () => KnowledgeBaseStore, _api?: unknown) {
    void _api;
    void set;
    void get;
  }
}

export type KnowledgeBaseContentAction = Pick<
  KnowledgeBaseContentActionImpl,
  keyof KnowledgeBaseContentActionImpl
>;
