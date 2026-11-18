import { type SessionStore } from '@/store/session';
import { type StoreSetter } from '@/store/types';

type Setter = StoreSetter<SessionStore>;
export const createSessionGroupSlice = (set: Setter, get: () => SessionStore, _api?: unknown) =>
  new SessionGroupActionImpl(set, get, _api);

class SessionGroupActionImpl {
  constructor(set: Setter, get: () => SessionStore, _api?: unknown) {
    void _api;
    void set;
  }
}

export type SessionGroupAction = Pick<SessionGroupActionImpl, keyof SessionGroupActionImpl>;
