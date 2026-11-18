import isEqual from 'fast-deep-equal';

import { createReplicaSlice, recordLens, type ReplicaLens } from '@/libs/replica';
import { type StoreSetter } from '@/store/types';
import { setNamespace } from '@/utils/storeDebug';

import { type UserMemoryStore } from '../../store';
import { type IdentityForInjection } from '../../types';
import { OffsetListPager } from '../utils/offsetListPager';
import {
  GLOBAL_IDENTITIES_KEY,
  globalIdentitiesResource,
  identityListResource,
  type IdentityListView,
} from './projection';

const n = setNamespace('userMemory/identity');

const GLOBAL_IDENTITIES_PARAMS = {} as Record<string, never>;

const identityEntries = recordLens<UserMemoryStore, IdentityListView>('identityListEntries');

/**
 * Flat mirrors of one identity page set (`undefined` = the active query has no
 * view yet). `identitiesInit` is only ever set here: it survives a query
 * change, so the page controls are not torn down while a search resolves.
 */
const identityMirrorsOf = (data: IdentityListView | undefined): Partial<UserMemoryStore> => {
  if (!data) return { identities: [], identitiesMeta: undefined };
  const { items, ...meta } = data;
  return { identities: items, identitiesInit: true, identitiesMeta: meta };
};

/**
 * The canonical value is one page set per search / filter / sort
 * (`identityListEntries`). The long-standing flat array (`identities`) and its
 * paging bookkeeping (`identitiesMeta`) mirror the active query's entry in the
 * same commit, so every existing reader (grid, timeline, card dropdown, route
 * boundary) keeps reading the same place.
 */
const identityListLens: ReplicaLens<UserMemoryStore, IdentityListView> = {
  clear: (state) => ({
    ...identityEntries.clear(state),
    identities: [],
    identitiesInit: false,
    identitiesMeta: undefined,
  }),
  get: identityEntries.get,
  keys: identityEntries.keys,
  set: (state, key, data) => ({
    ...identityEntries.set(state, key, data),
    ...(key === state.identityListKey ? identityMirrorsOf(data) : undefined),
  }),
};

/** Single-slot view of the injection-identities replica. */
const globalIdentitiesLens: ReplicaLens<UserMemoryStore, IdentityForInjection[]> = {
  clear: () => ({ globalIdentities: [], globalIdentitiesInit: false }),
  get: (state) => (state.globalIdentitiesInit ? state.globalIdentities : undefined),
  keys: (state) => (state.globalIdentitiesInit ? [GLOBAL_IDENTITIES_KEY] : []),
  set: (_state, _key, data) =>
    data
      ? { globalIdentities: data, globalIdentitiesInit: true }
      : { globalIdentities: [], globalIdentitiesInit: false },
};

type Setter = StoreSetter<UserMemoryStore>;
export const createIdentitySlice = (set: Setter, get: () => UserMemoryStore, _api?: unknown) =>
  new IdentityActionImpl(set, get, _api);

/**
 * The identities domain.
 *
 * Server state is two replicas: the paginated `identities` list (its flat array
 * is `identities`, its paging bookkeeping `identitiesMeta`) and the
 * `globalIdentities` injection list. Each paints its persisted copy on the
 * first frame and is confirmed by the network in the background; the engine
 * owns hydration, paging, optimistic overlays with rollback and scope
 * isolation.
 */
class IdentityActionImpl {
  readonly #globalIdentities;
  /** The identity list is a paged replica; the engine owns its paging. */
  readonly #identities;

  constructor(set: Setter, get: () => UserMemoryStore, _api?: unknown) {
    void _api;
    this.#identities = createReplicaSlice(identityListResource, {
      actionPrefix: n('identities'),
      get,
      set,
      stateKey: 'identitiesReplica',
      view: identityListLens,
      viewFields: ({ order, q, relationships, sort, types }) => ({
        order,
        q: q || undefined,
        relationships,
        sort,
        types,
      }),
    });
    this.#globalIdentities = createReplicaSlice(globalIdentitiesResource, {
      actionPrefix: n('globalIdentities'),
      get,
      // An unchanged list must not re-render the injection consumers.
      merge: (incoming, confirmed) => (isEqual(incoming, confirmed) ? undefined : incoming),
      set,
      stateKey: 'globalIdentitiesReplica',
      view: globalIdentitiesLens,
    });
    new OffsetListPager({
      keys: () => Object.keys(get().identityListEntries),
      read: (key) => get().identityListEntries[key],
      refreshHead: () => this.refreshIdentities(),
      scope: () => identityListResource.scope.get(),
      slice: this.#identities,
    });
  }

  /**
   * Revalidate the identity replicas of the active scope: the list and the
   * self identities injected into the chat context, which any identity write
   * can change. The replica scope carries the user + workspace, so this always
   * refreshes the lists the caller is in.
   */
  refreshIdentities = async (): Promise<void> => {
    await Promise.all([this.#identities.revalidate(), this.#globalIdentities.revalidate()]);
  };
}

export type IdentityAction = Pick<IdentityActionImpl, keyof IdentityActionImpl>;
