import { userMemoryKeys } from '@/libs/swr/keys';
import { userMemoryService } from '@/services/userMemory';
import { type StoreSetter } from '@/store/types';
import { setNamespace } from '@/utils/storeDebug';

import { type UserMemoryStore, useUserMemoryStore } from '../../store';
import { MemoryQueryList } from '../utils/memoryQueryList';
import {
  type ExperienceListData,
  type ExperienceListParams,
  experienceListResource,
} from './projection';

const n = setNamespace('userMemory/experience');

interface ExperienceQueryParams extends Partial<ExperienceListParams> {
  page?: number;
}

/** Flat mirrors of one page set (`undefined` = the active query has no view yet). */
const mirrorsOf = (data: ExperienceListData | undefined): Partial<UserMemoryStore> =>
  data
    ? {
        experienceListData: data,
        experiences: data.items,
        experiencesHasMore: data.hasMore,
        experiencesInit: true,
        experiencesPage: data.currentPage + 1,
        experiencesTotal: data.total ?? data.items.length,
      }
    : {
        experienceListData: undefined,
        experiences: [],
        experiencesHasMore: true,
        experiencesInit: false,
        experiencesPage: 1,
        experiencesTotal: 0,
      };

type Setter = StoreSetter<UserMemoryStore>;
export const createExperienceSlice = (set: Setter, get: () => UserMemoryStore, _api?: unknown) =>
  new ExperienceActionImpl(set, get, _api);

/**
 * The user-memory experience list: one `MemoryQueryList` (shared with the other
 * offset-paged memory lists) behind the slice's long-standing action names.
 */
class ExperienceActionImpl {
  constructor(set: Setter, get: () => UserMemoryStore, _api?: unknown) {
    void _api;
    new MemoryQueryList({
      actionPrefix: n('experienceList'),
      activeKeyField: 'experienceListKey',
      entriesField: 'experienceListEntries',
      fetchPage: async (params, page) => {
        const response = await userMemoryService.queryExperiences({
          page,
          pageSize: params.pageSize,
          q: params.q,
          sort: params.sort,
        });
        return { items: response.items, total: response.total };
      },
      get,
      mirror: mirrorsOf,
      queryFields: ({ q, sort }) => ({ experiencesQuery: q || undefined, experiencesSort: sort }),
      replicaField: 'experienceListReplica',
      resource: experienceListResource,
      rootKey: userMemoryKeys.experiences.root,
      set,
      useStore: (selector) => useUserMemoryStore(selector),
    });
  }
}

export type ExperienceAction = Pick<ExperienceActionImpl, keyof ExperienceActionImpl>;
