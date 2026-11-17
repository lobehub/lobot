import { type PartialDeep } from 'type-fest';

import { DEFAULT_AGENT_LOBE_SESSION } from '@/const/session';
import { analyticsClient } from '@/libs/analytics/client';
import { chatGroupService } from '@/services/chatGroup';
import { sessionService } from '@/services/session';
import { type SessionStore } from '@/store/session';
import { type StoreSetter } from '@/store/types';
import { getUserStoreState, useUserStore } from '@/store/user';
import { settingsSelectors, userProfileSelectors } from '@/store/user/selectors';
import {
  type LobeAgentSession,
  type LobeSessionGroups,
  type LobeSessions,
  type UpdateSessionParams,
} from '@/types/session';
import { LobeSessionType } from '@/types/session';
import { merge } from '@/utils/merge';
import { setNamespace } from '@/utils/storeDebug';

import { type SessionDispatch } from './reducers';
import { sessionsReducer } from './reducers';
import { sessionSelectors } from './selectors';

const n = setNamespace('session');

type Setter = StoreSetter<SessionStore>;
export const createSessionSlice = (set: Setter, get: () => SessionStore, _api?: unknown) =>
  new SessionActionImpl(set, get, _api);

class SessionActionImpl {
  constructor(set: Setter, get: () => SessionStore, _api?: unknown) {
    void _api;
  }
}

export type SessionAction = Pick<SessionActionImpl, keyof SessionActionImpl>;
