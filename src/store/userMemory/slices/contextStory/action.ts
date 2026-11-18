import { type StoreSetter } from '@/store/types';

import { type UserMemoryStore } from '../../store';

type Setter = StoreSetter<UserMemoryStore>;
export const createContextStorySlice = (set: Setter, get: () => UserMemoryStore, _api?: unknown) =>
  new ContextStoryActionImpl(set, get, _api);

/** Consolidated contexts (context → dossiers → evidence), read-only for now. */
class ContextStoryActionImpl {
  constructor(set: Setter, get: () => UserMemoryStore, _api?: unknown) {
    void _api;
  }
}

export type ContextStoryAction = Pick<ContextStoryActionImpl, keyof ContextStoryActionImpl>;
