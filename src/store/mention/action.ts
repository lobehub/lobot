import { type StoreSetter } from '@/store/types';

import { type MentionStore } from './store';

type Setter = StoreSetter<MentionStore>;
export const createMentionSlice = (set: Setter, get: () => MentionStore, _api?: unknown) =>
  new MentionActionImpl(set, get, _api);

class MentionActionImpl {
  constructor(set: Setter, get: () => MentionStore, _api?: unknown) {
    void _api;
    void get;
  }
}

export type MentionAction = Pick<MentionActionImpl, keyof MentionActionImpl>;
