import { userMemoryKeys } from '@/libs/swr/keys';
import { userMemoryService } from '@/services/userMemory';
import { type StoreSetter } from '@/store/types';
import { setNamespace } from '@/utils/storeDebug';

import { type UserMemoryStore, useUserMemoryStore } from '../../store';
import { MemoryQueryList } from '../utils/memoryQueryList';
import { type ActivityListData, type ActivityListParams, activityListResource } from './projection';

const n = setNamespace('userMemory/activity');

interface ActivityQueryParams extends Partial<ActivityListParams> {
  page?: number;
}

/** Flat mirrors of one page set (`undefined` = the active query has no view yet). */
const mirrorsOf = (data: ActivityListData | undefined): Partial<UserMemoryStore> =>
  data
    ? {
        activityListData: data,
        activities: data.items,
        activitiesHasMore: data.hasMore,
        activitiesInit: true,
        activitiesPage: data.currentPage + 1,
        activitiesTotal: data.total ?? data.items.length,
      }
    : {
        activityListData: undefined,
        activities: [],
        activitiesHasMore: true,
        activitiesInit: false,
        activitiesPage: 1,
        activitiesTotal: 0,
      };

type Setter = StoreSetter<UserMemoryStore>;
export const createActivitySlice = (set: Setter, get: () => UserMemoryStore, _api?: unknown) =>
  new ActivityActionImpl(set, get, _api);

/**
 * The user-memory activity list: one `MemoryQueryList` (shared with the other
 * offset-paged memory lists) behind the slice's long-standing action names.
 */
class ActivityActionImpl {
  constructor(set: Setter, get: () => UserMemoryStore, _api?: unknown) {
    void _api;
    new MemoryQueryList({
      actionPrefix: n('activityList'),
      activeKeyField: 'activityListKey',
      entriesField: 'activityListEntries',
      fetchPage: async (params, page) => {
        const response = await userMemoryService.queryActivities({
          page,
          pageSize: params.pageSize,
          q: params.q,
          sort: params.sort,
          status: params.status,
          types: params.types,
        });
        return { items: response.items, total: response.total };
      },
      get,
      mirror: mirrorsOf,
      queryFields: ({ q, sort }) => ({ activitiesQuery: q || undefined, activitiesSort: sort }),
      replicaField: 'activityListReplica',
      resource: activityListResource,
      rootKey: userMemoryKeys.activities.root,
      set,
      useStore: (selector) => useUserMemoryStore(selector),
    });
  }
}

export type ActivityAction = Pick<ActivityActionImpl, keyof ActivityActionImpl>;
