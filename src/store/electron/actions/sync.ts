import { isDesktop } from '@lobechat/const';
import { type DataSyncConfig } from '@lobechat/electron-client-ipc';
import isEqual from 'fast-deep-equal';

import { createReplicaSlice, type ReplicaSyncResult } from '@/libs/replica';
import { remoteServerService } from '@/services/electron/remoteServer';
import { type StoreSetter } from '@/store/types';
import { useUserStore } from '@/store/user';

import { defaultDataSyncConfig } from '../initialState';
import { selfFieldsLens } from '../lens';
import { dataSyncConfigResource, DESKTOP_SELF_KEY } from '../projection';
import { type ElectronStore } from '../store';

/**
 * Remote server actions
 */

type Setter = StoreSetter<ElectronStore>;
export const remoteSyncSlice = (set: Setter, get: () => ElectronStore, _api?: unknown) =>
  new ElectronRemoteServerActionImpl(set, get, _api);

class ElectronRemoteServerActionImpl {
  readonly #dataSyncConfig;
  readonly #get: () => ElectronStore;
  readonly #set: Setter;

  constructor(set: Setter, get: () => ElectronStore, _api?: unknown) {
    void _api;
    this.#set = set;
    this.#get = get;
    this.#dataSyncConfig = createReplicaSlice(dataSyncConfigResource, {
      actionPrefix: 'dataSyncConfig',
      fetcher: async () => {
        try {
          return await remoteServerService.getRemoteServerConfig();
        } catch (error) {
          console.error('Failed to get remote server configuration:', error);
          throw error;
        }
      },
      get,
      // Only refresh on genuine config changes AFTER the first answer. On
      // initial load the stores are already fresh, and `refreshUserData` runs
      // `stores.reset()` which wipes chat state (notably `activeAgentId`) that
      // `AgentIdSync` just set from the URL — leaving the topic list unable to
      // resolve its agent scope on reload.
      prepareHead: (incoming, current) => {
        if (current !== undefined && !isEqual(incoming, current)) {
          void this.#get()
            .refreshUserData()
            .catch((error) => {
              console.error('Failed to refresh user data:', error);
            });
        }
        return incoming;
      },
      set,
      stateKey: 'dataSyncConfigReplica',
      view: selfFieldsLens<ElectronStore, DataSyncConfig>(
        (s) => (s.isInitRemoteServerConfig ? s.dataSyncConfig : undefined),
        (data) =>
          data
            ? { dataSyncConfig: data, isInitRemoteServerConfig: true }
            : { dataSyncConfig: defaultDataSyncConfig, isInitRemoteServerConfig: false },
      ),
    });
  }

  clearRemoteServerSyncError = (): void => {
    this.#set({ remoteServerSyncError: undefined }, false, 'clearRemoteServerSyncError');
  };

  connectRemoteServer = async (values: DataSyncConfig): Promise<void> => {
    if (values.storageMode === 'selfHost' && !values.remoteServerUrl) return;

    this.#set({ isConnectingServer: true });
    this.#get().clearRemoteServerSyncError();
    try {
      // Get current configuration
      const config = await remoteServerService.getRemoteServerConfig();

      // If already active, need to clear first
      if (!isEqual(config, values)) {
        await remoteServerService.setRemoteServerConfig({ ...values, active: false });
      }

      // Request authorization
      const result = await remoteServerService.requestAuthorization(values);

      if (!result.success) {
        console.error('Authorization request failed:', result.error);

        this.#set({
          remoteServerSyncError: { message: result.error, type: 'AUTH_ERROR' },
        });
      }
      // Refresh state
      await this.#get().refreshServerConfig();
    } catch (error) {
      console.error('Remote server configuration error:', error);
      this.#set({
        remoteServerSyncError: { message: (error as Error).message, type: 'CONFIG_ERROR' },
      });
    } finally {
      this.#set({ isConnectingServer: false });
    }
  };

  refreshServerConfig = async (): Promise<void> => {
    await this.#dataSyncConfig.revalidate();
  };

  refreshUserData = async (): Promise<void> => {
    const { stores } = await import('@/store/utils/userDataStores');
    stores.reset();

    const { useChatStore } = await import('@/store/chat');
    await useChatStore.getState().refreshMessages();
    await useChatStore.getState().refreshTopic();
    await useUserStore.getState().refreshUserState();
  };

  /** Read it from `dataSyncConfig` once `isInitRemoteServerConfig` is set. */
  useDataSyncConfig = (): ReplicaSyncResult =>
    // Desktop-only IPC: on web there is no electronAPI, so never fetch off-desktop.
    this.#dataSyncConfig.useSync(isDesktop ? DESKTOP_SELF_KEY : null);
}

export type ElectronRemoteServerAction = Pick<
  ElectronRemoteServerActionImpl,
  keyof ElectronRemoteServerActionImpl
>;
