import { type DynamicRouteMeta } from '@/spa/router/routeMeta';
import { type StoreSetter } from '@/store/types';

import { type ElectronStore } from '../store';

// ======== Types ======== //

// Live resolved meta of the active route, published by RouteMetaBridge; the url
// is the one that produced it (used to match the meta against the active tab).
export interface CurrentRouteMetaState {
  currentRouteMeta: DynamicRouteMeta | null;
  currentRouteMetaUrl: string | null;
}

// ======== Initial State ======== //

export const currentRouteMetaInitialState: CurrentRouteMetaState = {
  currentRouteMeta: null,
  currentRouteMetaUrl: null,
};

// ======== Action Implementation ======== //

type Setter = StoreSetter<ElectronStore>;
export const createCurrentRouteMetaSlice = (
  set: Setter,
  get: () => ElectronStore,
  _api?: unknown,
) => new CurrentRouteMetaActionImpl(set, get, _api);

class CurrentRouteMetaActionImpl {
  constructor(set: Setter, get: () => ElectronStore, _api?: unknown) {
    void _api;
  }
}

export type CurrentRouteMetaAction = Pick<
  CurrentRouteMetaActionImpl,
  keyof CurrentRouteMetaActionImpl
>;
