import isEqual from 'fast-deep-equal';
import { useEffect } from 'react';
import { gt, parse, valid } from 'semver';

import { getActiveWorkspaceId } from '@/business/client/hooks/useActiveWorkspaceId';
import { getActiveWorkspaceSlug } from '@/business/client/hooks/useActiveWorkspaceSlug';
import { WEB_APP_VERSION } from '@/const/appVersion';
import { CURRENT_VERSION, isDesktop } from '@/const/version';
import { buildWorkspaceAwarePath } from '@/features/Workspace/workspaceAwarePath';
import { createReplicaSlice, recordLens, type ReplicaSyncResult } from '@/libs/replica';
import { globalService } from '@/services/global';
import { getElectronStoreState } from '@/store/electron';
import { electronSyncSelectors } from '@/store/electron/selectors';
import type { SystemStatus } from '@/store/global/initialState';
import type { StoreSetter } from '@/store/types';
import type { LocaleMode } from '@/types/locale';
import { switchLang } from '@/utils/client/switchLang';
import { merge } from '@/utils/merge';
import { setNamespace } from '@/utils/storeDebug';

import {
  latestVersionResource,
  serverVersionResource,
  type ServerVersionValue,
  VERSION_CHECK_KEY,
} from '../projection';
import { routeOverlayWrites } from '../selectors/systemStatus';
import type { GlobalStore } from '../store';

const n = setNamespace('g');

const VERSION_PARAMS = {} as Record<string, never>;

/**
 * Version checks run once per session: focus and reconnect do not repeat them,
 * and `isPaused` holds the refetch a workspace switch (a new sync key) would start.
 */
const ONCE = { revalidateOnFocus: false, revalidateOnReconnect: false } as const;

type Setter = StoreSetter<GlobalStore>;
export const generalActionSlice = (set: Setter, get: () => GlobalStore, _api?: unknown) =>
  new GlobalGeneralActionImpl(set, get, _api);

class GlobalGeneralActionImpl {
  readonly #get: () => GlobalStore;
  readonly #latestVersion;
  readonly #serverVersion;
  readonly #set: Setter;

  constructor(set: Setter, get: () => GlobalStore, _api?: unknown) {
    void _api;
    this.#set = set;
    this.#get = get;
    this.#latestVersion = createReplicaSlice(latestVersionResource, {
      actionPrefix: n('latestVersion'),
      effects: { onApplied: (data) => this.#applyLatestVersion(data) },
      fetcher: () => globalService.getLatestVersion(),
      get,
      set,
      stateKey: 'latestVersionCheckReplica',
      view: recordLens<GlobalStore, string>('latestVersionCheckMap'),
    });
    this.#serverVersion = createReplicaSlice(serverVersionResource, {
      actionPrefix: n('serverVersion'),
      effects: { onApplied: (data) => this.#applyServerVersion(data) },
      fetcher: async () => ({ version: await globalService.getServerVersion() }),
      get,
      set,
      stateKey: 'serverVersionCheckReplica',
      view: recordLens<GlobalStore, ServerVersionValue>('serverVersionCheckMap'),
    });
  }

  #applyLatestVersion = (data: string) => {
    const version = isDesktop ? CURRENT_VERSION : WEB_APP_VERSION;
    if (!valid(version) || !valid(data)) return;

    const currentVersion = parse(version);
    const latestVersion = parse(data);

    if (!currentVersion || !latestVersion) return;

    const currentMajorMinor = `${currentVersion.major}.${currentVersion.minor}.0`;
    const latestMajorMinor = `${latestVersion.major}.${latestVersion.minor}.0`;

    if (gt(latestMajorMinor, currentMajorMinor)) {
      this.#set({ hasNewVersion: true, latestVersion: data }, false, n('checkLatestVersion'));
    }
  };

  #applyServerVersion = ({ version: data }: ServerVersionValue) => {
    if (data === null) {
      this.#set({ isServerVersionOutdated: true }, false);
      return;
    }

    this.#set({ serverVersion: data }, false);

    if (!valid(CURRENT_VERSION) || !valid(data)) return;

    const clientVersion = parse(CURRENT_VERSION);
    const serverVersion = parse(data);

    if (!clientVersion || !serverVersion) return;

    const DIFF_THRESHOLD = 5;
    //         Version difference calculation rules
    // ┌─────────────────┬────────┬───────────┐
    // │ Client → Server │  Diff  │  Result   │
    // ├─────────────────┼────────┼───────────┤
    // │ 1.0.5 → 1.0.0   │ 5      │ ⚠️ Too old│
    // ├─────────────────┼────────┼───────────┤
    // │ 1.1.0 → 1.0.5   │ 5      │ ⚠️ Too old│
    // ├─────────────────┼────────┼───────────┤
    // │ 2.0.0 → 1.9.9   │ 91     │ ⚠️ Too old│
    // ├─────────────────┼────────┼───────────┤
    // │ 1.0.4 → 1.0.0   │ 4      │ ✅ Normal │
    // └─────────────────┴────────┴───────────┘
    const versionDiff =
      (clientVersion.major - serverVersion.major) * 100 +
      (clientVersion.minor - serverVersion.minor) * 10 +
      (clientVersion.patch - serverVersion.patch);

    if (versionDiff >= DIFF_THRESHOLD) {
      this.#set({ isServerVersionOutdated: true }, false);
    }
  };

  openAgentInNewWindow = async (agentId: string): Promise<void> => {
    if (isDesktop) {
      try {
        const { ensureElectronIpc } = await import('@/utils/electron/ipc');
        const path = `/agent/${agentId}?mode=single`;

        const result = await ensureElectronIpc().windows.createMultiInstanceWindow({
          path,
          templateId: 'chatSingle',
          uniqueId: `chat_${agentId}`,
        });

        if (!result.success) {
          console.error('Failed to open agent in new window:', result.error);
        }
      } catch (error) {
        console.error('Error opening agent in new window:', error);
      }
    } else {
      // Open in popup window for browser
      const browserUrl = buildWorkspaceAwarePath(`/agent/${agentId}`, getActiveWorkspaceSlug());
      const width = 1200;
      const height = 800;
      const left = (window.screen.width - width) / 2;
      const top = (window.screen.height - height) / 2;
      const features = `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes,status=yes`;
      window.open(browserUrl, `agent_${agentId}`, features);
    }
  };

  switchLocale = (
    locale: LocaleMode,
    { skipBroadcast }: { skipBroadcast?: boolean } = {},
  ): void => {
    this.#get().updateSystemStatus({ language: locale });

    switchLang(locale);

    if (isDesktop && !skipBroadcast) {
      (async () => {
        try {
          const { ensureElectronIpc } = await import('@/utils/electron/ipc');

          await ensureElectronIpc().system.updateLocale(locale);
        } catch (error) {
          console.error('Failed to update locale in main process:', error);
        }
      })();
    }
  };

  setNavPanelResizing = (resizing: boolean): void => {
    if (!!this.#get().isNavPanelResizing === resizing) return;

    this.#set({ isNavPanelResizing: resizing }, false, n('setNavPanelResizing'));
  };

  updateSystemStatus = (
    status: Partial<SystemStatus>,
    action?: any,
    options?: { skipWorkspaceOverlay?: boolean },
  ): void => {
    if (!this.#get().isStatusInit) return;

    // When inside a workspace, route whitelisted sidebar-layout fields into
    // `status.workspace.*` so personal-mode preferences stay untouched. The
    // init path bypasses routing — it rehydrates whatever shape was persisted.
    const workspaceId = options?.skipWorkspaceOverlay ? null : getActiveWorkspaceId();
    const routedPatch = routeOverlayWrites(status, workspaceId);

    const nextStatus = merge(this.#get().status, routedPatch);

    if (isEqual(this.#get().status, nextStatus)) return;

    this.#set({ status: nextStatus }, false, action || n('updateSystemStatus'));
    this.#get().statusStorage.saveToLocalStorage(nextStatus);
  };

  useCheckLatestVersion = (enabledCheck: boolean = true): ReplicaSyncResult =>
    this.#latestVersion.useSync(VERSION_PARAMS, {
      ...ONCE,
      enabled: enabledCheck,
      isPaused: () => this.#get().latestVersionCheckMap[VERSION_CHECK_KEY] !== undefined,
    });

  useCheckServerVersion = (): ReplicaSyncResult =>
    this.#serverVersion.useSync(VERSION_PARAMS, {
      ...ONCE,
      enabled: isDesktop && !electronSyncSelectors.isOfficialServer(getElectronStoreState()),
      isPaused: () => this.#get().serverVersionCheckMap[VERSION_CHECK_KEY] !== undefined,
    });

  /** Restore the persisted system status once the app mounts. */
  useInitSystemStatus = (): void => {
    useEffect(() => {
      if (this.#get().isStatusInit) return;

      const status = this.#get().statusStorage.getFromLocalStorageSync();
      this.#set({ isStatusInit: true }, false, 'setStatusInit');

      // Reset transient UI states that should not persist across page reloads
      const statusWithResetTransientStates = {
        ...status,
        showCommandMenu: false,
        showHotkeyHelper: false,
        workingSidebarRevealRequest: undefined,
      };

      this.#get().updateSystemStatus(statusWithResetTransientStates, 'initSystemStatus', {
        skipWorkspaceOverlay: true,
      });
    }, []);
  };
}

export type GlobalGeneralAction = Pick<GlobalGeneralActionImpl, keyof GlobalGeneralActionImpl>;
