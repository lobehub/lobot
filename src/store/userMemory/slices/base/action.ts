import { createReplicaSlice, type ReplicaLens } from '@/libs/replica';
import { userMemoryService } from '@/services/userMemory';
import { type StoreSetter } from '@/store/types';
import { type RetrieveMemoryResult } from '@/types/userMemory';
import { LayersEnum } from '@/types/userMemory';
import { setNamespace } from '@/utils/storeDebug';

import { type UserMemoryStore } from '../../store';
import { userMemoryCacheKey } from '../../utils/cacheKey';
import { createMemorySearchParams } from '../../utils/searchParams';
import {
  type MemoryDetailDisplay,
  type MemoryDetailParams,
  userMemoryDetailResource,
  userMemoryRetrieveResource,
} from './projection';

const n = setNamespace('userMemory');

type MemoryContext = Parameters<typeof createMemorySearchParams>[0];

/**
 * The retrieve result map keeps its long-standing flat field (`memoryMap`) as the
 * replica view, plus the per-entry fetched-at stamp the memory selectors read.
 * The engine owns every write; the selectors keep reading the same place.
 */
const retrieveMapLens: ReplicaLens<UserMemoryStore, RetrieveMemoryResult> = {
  clear: () => ({ memoryFetchedAtMap: {}, memoryMap: {} }),
  get: (state, key) => state.memoryMap[key],
  keys: (state) => Object.keys(state.memoryMap),
  set: (state, key, data) => {
    const memoryMap = { ...state.memoryMap };
    const memoryFetchedAtMap = { ...state.memoryFetchedAtMap };

    if (data === undefined) {
      delete memoryMap[key];
      delete memoryFetchedAtMap[key];
    } else {
      memoryMap[key] = data;
      memoryFetchedAtMap[key] = Date.now();
    }

    return { memoryFetchedAtMap, memoryMap };
  },
};

/**
 * One memory detail per `${layer}:${id}`, mirrored into `memoryDetailMap` so the
 * right-hand panels read the replica view instead of a raw SWR cache entry.
 */
const detailMapLens: ReplicaLens<UserMemoryStore, MemoryDetailDisplay> = {
  clear: () => ({ memoryDetailMap: {} }),
  get: (state, key) => state.memoryDetailMap[key],
  keys: (state) => Object.keys(state.memoryDetailMap),
  set: (state, key, data) => {
    const memoryDetailMap = { ...state.memoryDetailMap };

    if (data === undefined) delete memoryDetailMap[key];
    else memoryDetailMap[key] = data;

    return { memoryDetailMap };
  },
};

type Setter = StoreSetter<UserMemoryStore>;
export const createBaseSlice = (set: Setter, get: () => UserMemoryStore, _api?: unknown) =>
  new BaseActionImpl(set, get, _api);

class BaseActionImpl {
  readonly #set: Setter;

  constructor(set: Setter, get: () => UserMemoryStore, _api?: unknown) {
    void _api;
    this.#set = set;
    createReplicaSlice(userMemoryDetailResource, {
      actionPrefix: n('memoryDetail'),
      fetcher: (params) => this.#fetchDetail(params),
      get,
      // A detail the server no longer has removes the cached one, so a memory
      // deleted elsewhere (or a stale detail URL) renders the not-found state.
      isMissing: (detail) => detail === null,
      set,
      stateKey: 'memoryDetailReplica',
      view: detailMapLens,
    });
    createReplicaSlice(userMemoryRetrieveResource, {
      actionPrefix: n('memoryRetrieve'),
      fetcher: (params) => userMemoryService.retrieveMemory(params),
      get,
      set,
      stateKey: 'memoryRetrieveReplica',
      view: retrieveMapLens,
    });
  }

  /**
   * Flatten the nested detail response into the shape the right-hand panel
   * reads. `null` means "no such memory": it removes the cached detail
   * (`isMissing`), and the panel renders as empty.
   */
  #fetchDetail = async ({ id, layer }: MemoryDetailParams): Promise<MemoryDetailDisplay | null> => {
    const detail = await userMemoryService.getMemoryDetail({ id, layer });
    if (!detail || detail.layer !== layer) return null;

    const source = { source: detail.source, sourceType: detail.sourceType };

    switch (detail.layer) {
      case LayersEnum.Activity: {
        return { ...detail.memory, ...detail.activity, ...source };
      }
      case LayersEnum.Context: {
        return { ...detail.memory, ...detail.context, ...source };
      }
      case LayersEnum.Experience: {
        return { ...detail.memory, ...detail.experience, ...source };
      }
      case LayersEnum.Identity: {
        return { ...detail.memory, ...detail.identity, ...source };
      }
      case LayersEnum.Preference: {
        return { ...detail.memory, ...detail.preference, ...source };
      }
      default: {
        return null;
      }
    }
  };

  setActiveMemoryContext = (context?: MemoryContext): void => {
    const params = context ? createMemorySearchParams(context) : undefined;
    const key = params ? userMemoryCacheKey(params) : undefined;

    this.#set(
      { activeParams: params, activeParamsKey: key },
      false,
      n('setActiveMemoryContext', { key }),
    );
  };
}

export type BaseAction = Pick<BaseActionImpl, keyof BaseActionImpl>;
