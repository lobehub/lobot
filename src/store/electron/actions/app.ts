import { isDesktop } from '@lobechat/const';
import { type AppMenuNode, type ElectronAppState } from '@lobechat/electron-client-ipc';

import { globalAgentContextManager } from '@/helpers/GlobalAgentContextManager';
import { createReplicaSlice, recordLens, type ReplicaSyncResult } from '@/libs/replica';
import { electronSystemService } from '@/services/electron/system';
import { type StoreSetter } from '@/store/types';
import { merge } from '@/utils/merge';

import { selfFieldsLens } from '../lens';
import { DESKTOP_SELF_KEY, electronAppMenuResource, electronAppStateResource } from '../projection';
import { type ElectronStore } from '../store';

// ======== Action Interface ======== //

// ======== Action Implementation ======== //

type Setter = StoreSetter<ElectronStore>;
export const createElectronAppSlice = (set: Setter, get: () => ElectronStore, _api?: unknown) =>
  new ElectronAppActionImpl(set, get, _api);

/**
 * Mirror app state into the global agent context so prompt placeholders
 * ({{defaultShell}}, {{homePath}}, ...) always describe the real desktop
 * environment. Every app-state write path (initial fetch and later
 * `appStateUpdated` broadcasts) must go through this — a prompt that
 * disagrees with the actual runCommand shell makes the model emit commands
 * for the wrong shell (e.g. PowerShell syntax into Git Bash).
 */
const syncAppStateToAgentContext = (state: ElectronAppState): void => {
  globalAgentContextManager.updateContext({
    ...(state.arch ? { arch: state.arch } : {}),
    ...(state.defaultShell ? { defaultShell: state.defaultShell } : {}),
    ...(state.userPath
      ? {
          desktopPath: state.userPath.desktop,
          documentsPath: state.userPath.documents,
          downloadsPath: state.userPath.downloads,
          homePath: state.userPath.home,
          musicPath: state.userPath.music,
          picturesPath: state.userPath.pictures,
          userDataPath: state.userPath.userData,
          videosPath: state.userPath.videos,
        }
      : {}),
  });
};

class ElectronAppActionImpl {
  readonly #appMenu;
  readonly #appState;
  readonly #set: Setter;

  constructor(set: Setter, get: () => ElectronStore, _api?: unknown) {
    void _api;
    this.#set = set;
    this.#appState = createReplicaSlice(electronAppStateResource, {
      actionPrefix: 'electronAppState',
      // Locale is intentionally NOT applied here: the SPA boot flow
      // (SPAGlobalProvider's Locale) owns UI language, and a second switchLang
      // from this init path would race it.
      effects: { onApplied: syncAppStateToAgentContext },
      fetcher: () => electronSystemService.getAppState(),
      get,
      set,
      stateKey: 'appStateReplica',
      view: selfFieldsLens<ElectronStore, ElectronAppState>(
        (s) => (s.isAppStateInit ? s.appState : undefined),
        (data) =>
          data ? { appState: data, isAppStateInit: true } : { appState: {}, isAppStateInit: false },
      ),
    });
    this.#appMenu = createReplicaSlice(electronAppMenuResource, {
      actionPrefix: 'electronAppMenu',
      fetcher: () => electronSystemService.getAppMenu(),
      get,
      set,
      stateKey: 'appMenuReplica',
      view: recordLens<ElectronStore, AppMenuNode[]>('appMenuMap'),
    });
  }

  setConnectionDrawerOpen = (isOpen: boolean): void => {
    this.#set({ isConnectionDrawerOpen: isOpen }, false, 'setConnectionDrawerOpen');
  };

  updateElectronAppState = (state: ElectronAppState): void => {
    this.#appState.update(DESKTOP_SELF_KEY, (prev) => merge(prev ?? {}, state));
    syncAppStateToAgentContext(state);
  };

  /** Load the desktop app state once per launch; read it from `appState`. */
  useInitElectronAppState = (): ReplicaSyncResult =>
    this.#appState.useSync(isDesktop ? DESKTOP_SELF_KEY : null, {
      // The persisted copy paints before the main process answers; keep the
      // prompt context in step with what the store shows.
      onHydrated: syncAppStateToAgentContext,
      revalidateIfStale: false,
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    });

  /** The live app menu (read it with `electronAppSelectors.appMenu`). */
  useFetchAppMenu = (): ReplicaSyncResult =>
    this.#appMenu.useSync(isDesktop ? DESKTOP_SELF_KEY : null, {
      // The section simply stays hidden; the menu itself still works.
      onError: (error) => console.error('Failed to load the app menu hotkeys:', error),
      revalidateOnFocus: false,
    });
}

export type ElectronAppAction = Pick<ElectronAppActionImpl, keyof ElectronAppActionImpl>;
