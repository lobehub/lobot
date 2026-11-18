import { produce } from 'immer';

import { getActiveWorkspaceId } from '@/business/client/hooks/useActiveWorkspaceId';
import type { GlobalStore } from '@/store/global';
import type { WorkingSidebarTab } from '@/store/global/initialState';
import { readOverridableField } from '@/store/global/selectors/systemStatus';
import type { StoreSetter } from '@/store/types';
import { setNamespace } from '@/utils/storeDebug';

const n = setNamespace('w');

type Setter = StoreSetter<GlobalStore>;
export const globalWorkspaceSlice = (set: Setter, get: () => GlobalStore, _api?: unknown) =>
  new GlobalWorkspacePaneActionImpl(set, get, _api);

class GlobalWorkspacePaneActionImpl {
  readonly #get: () => GlobalStore;

  constructor(set: Setter, get: () => GlobalStore, _api?: unknown) {
    void _api;
    this.#get = get;
  }

  toggleCommandMenu = (visible?: boolean): void => {
    const currentVisible = this.#get().status.showCommandMenu;
    this.#get().updateSystemStatus({
      showCommandMenu: typeof visible === 'boolean' ? visible : !currentVisible,
    });
  };

  toggleExpandInputActionbar = (newValue?: boolean): void => {
    const expandInputActionbar =
      typeof newValue === 'boolean' ? newValue : !this.#get().status.expandInputActionbar;

    this.#get().updateSystemStatus(
      { expandInputActionbar },
      n('toggleExpandInputActionbar', newValue),
    );
  };

  toggleExpandSessionGroup = (id: string, expand: boolean): void => {
    const { status } = this.#get();
    // Read the effective (overlay-aware) value so workspace-mode toggles compose
    // off the workspace list, not the personal one underneath it.
    const currentKeys =
      readOverridableField(status, 'expandSessionGroupKeys', getActiveWorkspaceId()) ?? [];
    const nextExpandSessionGroup = produce(currentKeys, (draft: string[]) => {
      if (expand) {
        if (draft.includes(id)) return;
        draft.push(id);
      } else {
        const index = draft.indexOf(id);
        if (index !== -1) draft.splice(index, 1);
      }
    });
    this.#get().updateSystemStatus({ expandSessionGroupKeys: nextExpandSessionGroup });
  };

  toggleLeftPanel = (newValue?: boolean): void => {
    const showLeftPanel =
      typeof newValue === 'boolean' ? newValue : !this.#get().status.showLeftPanel;
    this.#get().updateSystemStatus({ showLeftPanel }, n('toggleLeftPanel', newValue));
  };

  toggleAgentBuilderPanel = (newValue?: boolean): void => {
    const showAgentBuilderPanel =
      typeof newValue === 'boolean' ? newValue : !this.#get().status.showAgentBuilderPanel;

    this.#get().updateSystemStatus(
      { showAgentBuilderPanel },
      n('toggleAgentBuilderPanel', newValue),
    );
  };

  toggleTaskAgentPanel = (newValue?: boolean): void => {
    const showTaskAgentPanel =
      typeof newValue === 'boolean' ? newValue : !this.#get().status.showTaskAgentPanel;

    this.#get().updateSystemStatus({ showTaskAgentPanel }, n('toggleTaskAgentPanel', newValue));
  };

  toggleRightPanel = (newValue?: boolean): void => {
    const showRightPanel =
      typeof newValue === 'boolean' ? newValue : !this.#get().status.showRightPanel;

    this.#get().updateSystemStatus({ showRightPanel }, n('toggleRightPanel', newValue));
  };

  toggleSystemRole = (newValue?: boolean): void => {
    const showSystemRole =
      typeof newValue === 'boolean' ? newValue : !this.#get().status.mobileShowTopic;

    this.#get().updateSystemStatus({ showSystemRole }, n('toggleMobileTopic', newValue));
  };

  setWorkingSidebarTab = (tab: WorkingSidebarTab): void => {
    const previousNonce = this.#get().status.workingSidebarTabRequest?.nonce ?? 0;
    this.#get().updateSystemStatus(
      {
        workingSidebarTab: tab,
        workingSidebarTabRequest: { nonce: previousNonce + 1, tab },
      },
      n('setWorkingSidebarTab', tab),
    );
  };

  openWorkingSidebar = (tab?: WorkingSidebarTab): void => {
    const previousNonce = this.#get().status.workingSidebarTabRequest?.nonce ?? 0;
    this.#get().updateSystemStatus(
      {
        showRightPanel: true,
        showWorkingOverview: false,
        ...(tab
          ? {
              workingSidebarTab: tab,
              workingSidebarTabRequest: { nonce: previousNonce + 1, tab },
            }
          : {}),
      },
      n('openWorkingSidebar', tab),
    );
  };

  openInBrowserTab = (url: string): void => {
    this.#get().openWorkingSidebar('browser');
    this.#get().updateSystemStatus(
      { workingSidebarBrowserRequest: { nonce: Date.now(), url } },
      n('openInBrowserTab'),
    );
  };

  /**
   * Retire the request as soon as the browser pane has acted on it. Without
   * this, the request survives in persisted status and every later remount of
   * the pane — which now happens on each topic switch, since the session key is
   * per-topic — would navigate that topic's page to the stale URL.
   */
  clearBrowserTabRequest = (): void => {
    if (!this.#get().status.workingSidebarBrowserRequest) return;
    this.#get().updateSystemStatus(
      { workingSidebarBrowserRequest: null },
      n('clearBrowserTabRequest'),
    );
  };
}

export type GlobalWorkspacePaneAction = Pick<
  GlobalWorkspacePaneActionImpl,
  keyof GlobalWorkspacePaneActionImpl
>;
