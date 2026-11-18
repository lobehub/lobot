import { createReplicaSlice, recordLens, type ReplicaSyncResult } from '@/libs/replica';
import { type DiscoverStore } from '@/store/discover';
import { globalHelpers } from '@/store/global/helpers';
import { type StoreSetter } from '@/store/types';
import {
  type DiscoverSkillDetail,
  type DiscoverSkillItem,
  type SkillCategoryItem,
  type SkillCommentListResponse,
  type SkillListResponse,
  type SkillQueryParams,
  type SkillRatingDistribution,
} from '@/types/discover';
import { setNamespace } from '@/utils/storeDebug';

import {
  skillCategoriesResource,
  skillCommentsResource,
  skillDetailResource,
  type SkillListParams,
  skillListQueryKey,
  skillListResource,
  skillRatingDistributionResource,
  skillRelatedResource,
} from './projection';

const n = setNamespace('discover/skill');

/**
 * Sync flags of a market read, plus the aliases the old SWR hooks returned
 * (`isLoading` / `mutate`) so a call site only has to move its `data` read to
 * the matching `skillSelectors` entry.
 */
interface SkillSyncResult extends ReplicaSyncResult {
  /** A request is in flight and this entry has no value to show yet. */
  isLoading: boolean;
  /** Alias of `revalidate`. */
  mutate: () => Promise<unknown>;
  /** Read the value with `skillSelectors.*(queryKey)`; undefined while disabled. */
  queryKey?: string;
}

type Setter = StoreSetter<DiscoverStore>;

interface SkillListSyncOptions {
  /** Collapse mounts of the same query within this window (ms). */
  dedupingInterval?: number;
  enabled?: boolean;
  revalidateOnFocus?: boolean;
}

/**
 * The params a skill list query is stored under: the UI language and the page
 * / page size defaults the market endpoint applies. A reader that walks several
 * pages builds each page's `skillListQueryKey` from this.
 */
const normalizeSkillListParams = (params: SkillQueryParams = {}): SkillListParams => ({
  ...params,
  locale: globalHelpers.getCurrentLanguage(),
  page: params.page ? Number(params.page) : 1,
  pageSize: params.pageSize ? Number(params.pageSize) : 21,
});

export const createSkillSlice = (set: Setter, get: () => DiscoverStore, _api?: unknown) =>
  new SkillActionImpl(set, get, _api);

class SkillActionImpl {
  readonly #get: () => DiscoverStore;
  readonly #list;

  constructor(set: Setter, get: () => DiscoverStore, _api?: unknown) {
    void _api;
    this.#get = get;
    this.#list = createReplicaSlice(skillListResource, {
      actionPrefix: n('list'),
      get,
      set,
      stateKey: 'skillListReplica',
      view: recordLens<DiscoverStore, SkillListResponse>('skillListMap'),
    });
    createReplicaSlice(skillDetailResource, {
      actionPrefix: n('detail'),
      get,
      set,
      stateKey: 'skillDetailReplica',
      view: recordLens<DiscoverStore, DiscoverSkillDetail>('skillDetailMap'),
    });
    createReplicaSlice(skillCategoriesResource, {
      actionPrefix: n('categories'),
      get,
      set,
      stateKey: 'skillCategoriesReplica',
      view: recordLens<DiscoverStore, SkillCategoryItem[]>('skillCategoriesMap'),
    });
    createReplicaSlice(skillCommentsResource, {
      actionPrefix: n('comments'),
      get,
      set,
      stateKey: 'skillCommentsReplica',
      view: recordLens<DiscoverStore, SkillCommentListResponse>('skillCommentsMap'),
    });
    createReplicaSlice(skillRatingDistributionResource, {
      actionPrefix: n('ratingDistribution'),
      get,
      set,
      stateKey: 'skillRatingDistributionReplica',
      view: recordLens<DiscoverStore, SkillRatingDistribution>('skillRatingDistributionMap'),
    });
    createReplicaSlice(skillRelatedResource, {
      actionPrefix: n('related'),
      get,
      set,
      stateKey: 'skillRelatedReplica',
      view: recordLens<DiscoverStore, DiscoverSkillItem[]>('skillRelatedMap'),
    });
  }

  #toSyncResult = (
    sync: ReplicaSyncResult,
    queryKey: string | undefined,
    hasValue: boolean,
    active: boolean,
  ): SkillSyncResult => ({
    ...sync,
    // A disabled hook never loads; a settled entry with a value never flashes.
    isLoading: active && !hasValue && (!sync.isHydrated || sync.isValidating),
    mutate: sync.revalidate,
    queryKey: active ? queryKey : undefined,
  });

  /**
   * The skill market list of one query. Each (filters · page) pair is its own
   * entry, so the URL-driven pager walks entries instead of appending pages.
   * Read the rows with `skillSelectors.skillList(queryKey)`.
   */
  useFetchSkillList = (
    params: SkillQueryParams = {},
    options: SkillListSyncOptions = {},
  ): SkillSyncResult => {
    const { enabled = true, ...schedule } = options;
    const normalized = normalizeSkillListParams(params);
    const queryKey = skillListQueryKey(normalized);
    const sync = this.#list.useSync(normalized, { enabled, ...schedule });
    return this.#toSyncResult(sync, queryKey, !!this.#get().skillListMap[queryKey], enabled);
  };
}

export type SkillAction = Pick<SkillActionImpl, keyof SkillActionImpl>;
