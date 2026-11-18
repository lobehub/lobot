import { type LobeTool } from '@lobot/types';

import { createReplicaSlice, type ReplicaLens } from '@/libs/replica';
import { subscribeCacheScope } from '@/libs/replica/cacheScopeEvents';
import { pluginService } from '@/services/plugin';
import { type StoreSetter } from '@/store/types';
import { type PluginInstallError } from '@/types/tool/plugin';
import { setNamespace } from '@/utils/storeDebug';

import { type ToolStore } from '../../store';
import {
  INSTALLED_PLUGINS_KEY,
  INSTALLED_PLUGINS_PARAMS,
  installedPluginsEntity,
  installedPluginsResource,
  toInstalledPluginsProjection,
} from './projection';

const n = setNamespace('plugin');

/**
 * The installed plugins keep their long-standing flat `installedPlugins` field
 * as the replica view, so every selector and direct reader keeps reading what it
 * did. The init flag gates `get`: before the first hydrate / replace the view
 * must read `undefined`, otherwise the empty default would block hydration from
 * storage.
 */
const installedPluginsLens: ReplicaLens<ToolStore, LobeTool[]> = {
  clear: () => ({ installedPlugins: [], isInstalledPluginsInit: false }),
  get: (state) => (state.isInstalledPluginsInit ? state.installedPlugins : undefined),
  keys: (state) => (state.isInstalledPluginsInit ? [INSTALLED_PLUGINS_KEY] : []),
  set: (_state, _key, data) =>
    data
      ? { installedPlugins: data, isInstalledPluginsInit: true }
      : { installedPlugins: [], isInstalledPluginsInit: false },
};

type Setter = StoreSetter<ToolStore>;
export const createPluginSlice = (set: Setter, get: () => ToolStore, _api?: unknown) =>
  new PluginActionImpl(set, get, _api);

class PluginActionImpl {
  readonly #get: () => ToolStore;
  readonly #installedPlugins;
  readonly #set: Setter;

  constructor(set: Setter, get: () => ToolStore, _api?: unknown) {
    void _api;
    this.#set = set;
    this.#get = get;
    this.#installedPlugins = createReplicaSlice(installedPluginsResource, {
      actionPrefix: n('installedPlugins'),
      entity: installedPluginsEntity,
      fetcher: () => pluginService.getInstalledPlugins(),
      get,
      set,
      stateKey: 'installedPluginsReplica',
      // Settings and connection parameters never reach IndexedDB.
      toPersisted: toInstalledPluginsProjection,
      view: installedPluginsLens,
    });

    // Tool assembly and execution read the installed plugins outside any
    // component, and `refreshPlugins` runs on routes that do not mount
    // `useFetchInstalledPlugins`. Without a mounted sync nothing would reset the
    // view on a workspace / account switch until the next dispatch, so the
    // previous identity's plugins (connection parameters included) would stay
    // runnable. Drop them the moment the scope changes. The store is an
    // app-lifetime singleton, so the subscription is never torn down.
    subscribeCacheScope((scope) => this.#installedPlugins.ensureScope(scope));
  }

  /**
   * Fetch the installed plugins and confirm the replica with them. The painted
   * list stays on screen while the network answers.
   *
   * Imperative on purpose: install / uninstall / settings flows call it on
   * routes (e.g. the protocol-install popup) where no `useFetchInstalledPlugins`
   * is mounted, so revalidating the mounted sync queries would resolve without
   * fetching anything. The scope is captured before the request so a response
   * that lands after a workspace switch is dropped instead of written into the
   * next scope. Every mutation ends with this refresh, so it is `fresh`: it
   * retires the requests already in flight (sync or refresh), which started
   * before the mutation and would paint the pre-mutation list. Rejects when
   * the fetch fails.
   */
  refreshPlugins = async (): Promise<void> => {
    await this.#installedPlugins.fetch(INSTALLED_PLUGINS_PARAMS, { fresh: true });
  };

  updateInstallLoadingState = (id: string, loading: boolean | undefined): void => {
    this.#set(
      { pluginInstallLoading: { ...this.#get().pluginInstallLoading, [id]: loading } },
      false,
      'updateInstallLoadingState',
    );
  };

  updateInstallError = (id: string, error: PluginInstallError | undefined): void => {
    this.#set(
      { pluginInstallErrors: { ...this.#get().pluginInstallErrors, [id]: error } },
      false,
      'updateInstallError',
    );
  };
}

export type PluginAction = Pick<PluginActionImpl, keyof PluginActionImpl>;
