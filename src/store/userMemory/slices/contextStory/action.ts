import { type MemoryContextStory, type MemoryContextStoryList } from '@lobot/types';
import { type SWRResponse } from 'swr';

import { mutate, useClientDataSWR } from '@/libs/swr';
import { userMemoryKeys } from '@/libs/swr/keys';
import { memoryCRUDService } from '@/services/userMemory';
import { type StoreSetter } from '@/store/types';
import { setNamespace } from '@/utils/storeDebug';

import { type UserMemoryStore } from '../../store';

const n = setNamespace('userMemory/contextStory');

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
