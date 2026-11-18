import { createReplicaSlice, recordLens, type ReplicaSyncResult } from '@/libs/replica';
import { globalService } from '@/services/global';
import { type StoreSetter } from '@/store/types';
import { type GlobalRuntimeConfig } from '@/types/serverConfig';

import { globalConfigResource } from './projection';
import { type ServerConfigStore } from './store';

const CLOUD_DESKTOP_BUSINESS_FEATURES_FLAG = '__LOBECLOUD_DESKTOP_BUSINESS_FEATURES__';

const setDesktopBusinessFeaturesFlag = (enableBusinessFeatures: boolean | undefined) => {
  (globalThis as unknown as Record<string, boolean | undefined>)[
    CLOUD_DESKTOP_BUSINESS_FEATURES_FLAG
  ] = Boolean(enableBusinessFeatures);
};

const GLOBAL_CONFIG_PARAMS = {} as Record<string, never>;

type Setter = StoreSetter<ServerConfigStore>;
export const createServerConfigSlice = (
  set: Setter,
  get: () => ServerConfigStore,
  _api?: unknown,
) => new ServerConfigActionImpl(set, get, _api);

class ServerConfigActionImpl {
  readonly #get: () => ServerConfigStore;
  readonly #globalConfig;
  readonly #set: Setter;

  constructor(set: Setter, get: () => ServerConfigStore, _api?: unknown) {
    void _api;
    this.#get = get;
    this.#set = set;
    this.#globalConfig = createReplicaSlice(globalConfigResource, {
      actionPrefix: 'serverConfig/globalConfig',
      effects: {
        onApplied: (data) => this.#applyGlobalConfig(data),
        onError: () => {
          setDesktopBusinessFeaturesFlag(false);
          this.#set({ serverConfigInit: true }, false, 'initServerConfigFallback');
        },
      },
      fetcher: () => globalService.getGlobalConfig(),
      get,
      set,
      stateKey: 'globalConfigReplica',
      view: recordLens<ServerConfigStore, GlobalRuntimeConfig>('globalConfigMap'),
    });
  }

  #applyGlobalConfig = (data: GlobalRuntimeConfig) => {
    setDesktopBusinessFeaturesFlag(data.serverConfig.enableBusinessFeatures);
    this.#set(
      {
        billboard: data.billboard ?? null,
        canAccessDevDock: data.serverFeatureFlags.enableDevDock === true,
        featureFlags: data.serverFeatureFlags,
        serverConfig: data.serverConfig,
        serverConfigInit: true,
        serverConfigLoaded: true,
      },
      false,
      'initServerConfig',
    );
  };

  /**
   * Fetched until one answer lands, then never again this session: a later
   * answer would overwrite `featureFlags` and drop the DevDock overrides
   * merged into them (a workspace switch changes the sync key).
   */
  useInitServerConfig = (): ReplicaSyncResult =>
    this.#globalConfig.useSync(GLOBAL_CONFIG_PARAMS, {
      isPaused: () => this.#get().serverConfigLoaded,
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    });
}

export type ServerConfigAction = Pick<ServerConfigActionImpl, keyof ServerConfigActionImpl>;
