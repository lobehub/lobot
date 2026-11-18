import { isDesktop } from '@lobechat/const';
import type { GatewayConnectionState } from '@lobechat/electron-client-ipc';

import { createReplicaSlice, recordLens, type ReplicaSyncResult } from '@/libs/replica';
import { gatewayConnectionService } from '@/services/electron/gatewayConnection';
import { type StoreSetter } from '@/store/types';

import { selfFieldsLens } from '../lens';
import {
  DESKTOP_SELF_KEY,
  GATEWAY_STABLE_DEVICE_ID_KEY,
  gatewayConnectionStateResource,
  gatewayDeviceInfoResource,
  gatewayKeepAwakeResource,
  type GatewayStableDeviceId,
  gatewayStableDeviceIdResource,
} from '../projection';
import { type ElectronStore } from '../store';

type Setter = StoreSetter<ElectronStore>;
export const gatewaySlice = (set: Setter, get: () => ElectronStore, _api?: unknown) =>
  new ElectronGatewayActionImpl(set, get, _api);

export interface GatewayDeviceInfo {
  deviceId: string;
  hostname: string;
  platform: string;
}

class ElectronGatewayActionImpl {
  readonly #connectionState;
  readonly #deviceInfo;
  readonly #get: () => ElectronStore;
  readonly #keepAwake;
  readonly #stableDeviceId;

  constructor(set: Setter, get: () => ElectronStore, _api?: unknown) {
    void _api;
    this.#get = get;
    this.#connectionState = createReplicaSlice(gatewayConnectionStateResource, {
      actionPrefix: 'gatewayConnectionState',
      fetcher: () => gatewayConnectionService.getConnectionStatus(),
      get,
      set,
      stateKey: 'gatewayConnectionStateReplica',
      // Always loaded: the store starts out `disconnected` until the main process says otherwise.
      view: selfFieldsLens<ElectronStore, GatewayConnectionState>(
        (s) => ({ error: s.gatewayConnectionError, status: s.gatewayConnectionStatus }),
        (data) => ({
          gatewayConnectionError: data?.error,
          gatewayConnectionStatus: data?.status ?? 'disconnected',
        }),
      ),
    });
    this.#deviceInfo = createReplicaSlice(gatewayDeviceInfoResource, {
      actionPrefix: 'gatewayDeviceInfo',
      fetcher: async () => (await gatewayConnectionService.getDeviceInfo()) as GatewayDeviceInfo,
      get,
      set,
      stateKey: 'gatewayDeviceInfoReplica',
      view: selfFieldsLens<ElectronStore, GatewayDeviceInfo>(
        (s) => s.gatewayDeviceInfo,
        (data) => ({ gatewayDeviceInfo: data }),
      ),
    });
    this.#keepAwake = createReplicaSlice(gatewayKeepAwakeResource, {
      actionPrefix: 'gatewayKeepAwake',
      fetcher: async () => (await gatewayConnectionService.getKeepAwake()).enabled,
      get,
      set,
      stateKey: 'gatewayKeepAwakeReplica',
      view: recordLens<ElectronStore, boolean>('gatewayKeepAwakeMap'),
    });
    this.#stableDeviceId = createReplicaSlice(gatewayStableDeviceIdResource, {
      actionPrefix: 'gatewayStableDeviceId',
      fetcher: async (): Promise<GatewayStableDeviceId> => ({
        deviceId: (await this.resolveGatewayDeviceId()) ?? null,
      }),
      get,
      set,
      stateKey: 'gatewayStableDeviceIdReplica',
      view: recordLens<ElectronStore, GatewayStableDeviceId>('gatewayStableDeviceIdMap'),
    });
  }

  connectGateway = async (): Promise<void> => {
    this.setGatewayConnectionState({ status: 'connecting' });
    try {
      const result = await gatewayConnectionService.connect();
      if (!result.success) {
        // The main process owns the outcome (and its reason); a superseded
        // attempt may already be connecting again, so take its state as is.
        this.setGatewayConnectionState(await gatewayConnectionService.getConnectionStatus());
      }
    } catch (error) {
      console.error('Gateway connect failed:', error);
      this.setGatewayConnectionState({ status: 'disconnected' });
    }
  };

  setGatewayConnectionState = ({ error, status }: GatewayConnectionState): void => {
    this.#connectionState.update(DESKTOP_SELF_KEY, () => ({ error, status }));
  };

  /**
   * Keep this computer from idle-sleeping while its device gateway connection
   * is enabled. Optimistic; a refused write rolls the switch back.
   */
  setGatewayKeepAwake = async (enabled: boolean): Promise<void> => {
    await this.#keepAwake.optimistic(
      DESKTOP_SELF_KEY,
      () => enabled,
      () => gatewayConnectionService.setKeepAwake(enabled),
      { confirm: (result) => () => result.enabled },
    );
  };

  /**
   * This desktop's stable device id, for writes that pin a topic's cwd to it.
   *
   * Asked over IPC every time rather than read from `gatewayDeviceInfo`: before
   * the gateway connects, that holds the install's fallback UUID, which stops
   * naming this machine once the user-scoped identity is derived. The IPC
   * derives that identity locally — no network on the send path — and returns
   * nothing while signed out, so no pin is written rather than a stale one.
   * A differing cached id is corrected too, so "this device" comparisons agree
   * with the pins written here.
   */
  resolveGatewayDeviceId = async (): Promise<string | undefined> => {
    if (!isDesktop) return;
    try {
      const deviceId = (await gatewayConnectionService.getStableDeviceId()) ?? undefined;
      const cached = this.#get().gatewayDeviceInfo;
      if (deviceId && cached && cached.deviceId !== deviceId) {
        this.#deviceInfo.update(DESKTOP_SELF_KEY, (info) => info && { ...info, deviceId });
      }
      return deviceId;
    } catch (error) {
      console.error('Gateway device id lookup failed:', error);
      return;
    }
  };

  /**
   * Keep this machine's stable device id in sync for a mounted view that must
   * not act before it is known. Data comes from
   * `electronSelectors.gatewayStableDeviceId`; resolving also corrects a cached
   * fallback id in `gatewayDeviceInfo`.
   */
  useFetchGatewayStableDeviceId = (enabled = true): ReplicaSyncResult =>
    this.#stableDeviceId.useSync(isDesktop && enabled ? GATEWAY_STABLE_DEVICE_ID_KEY : null);

  /** Desktop-only IPC: on web there is no electronAPI, so never fetch off-desktop. */
  useFetchGatewayDeviceInfo = (): ReplicaSyncResult =>
    this.#deviceInfo.useSync(isDesktop ? DESKTOP_SELF_KEY : null);

  /** Read it with `electronGatewaySelectors.keepAwake`. */
  useFetchGatewayKeepAwake = (): ReplicaSyncResult =>
    this.#keepAwake.useSync(isDesktop ? DESKTOP_SELF_KEY : null, { revalidateOnFocus: false });

  useFetchGatewayStatus = (): ReplicaSyncResult =>
    this.#connectionState.useSync(isDesktop ? DESKTOP_SELF_KEY : null);
}

export type ElectronGatewayAction = Pick<
  ElectronGatewayActionImpl,
  keyof ElectronGatewayActionImpl
>;
