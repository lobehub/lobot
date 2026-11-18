import { type SessionStore } from '@/store/session';
import { type StoreSetter } from '@/store/types';

type Setter = StoreSetter<SessionStore>;
export const createSessionSlice = (set: Setter, get: () => SessionStore, _api?: unknown) =>
  new SessionActionImpl(set, get, _api);

class SessionActionImpl {
  constructor(set: Setter, get: () => SessionStore, _api?: unknown) {
    void _api;
  }
}

export type SessionAction = Pick<SessionActionImpl, keyof SessionActionImpl>;
