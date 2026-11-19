export interface NavigationBroadcastEvents {
  /**
   * Ask renderer to close the active tab, or fall back to closing the window
   * when only one (or zero) tab is left. Triggered by Cmd/Ctrl+W on the main window.
   */
  closeCurrentTabOrWindow: () => void;

  /**
   * Ask renderer to create a new agent.
   * Triggered from the main process File menu.
   */
  createNewAgent: () => void;

  /**
   * Ask renderer to start a new group chat: a Channel where Channels are on, otherwise an
   * agent group. Triggered from the main process menu.
   */
  createNewAgentGroup: () => void;

  /**
   * Ask renderer to create a new page.
   * Triggered from the main process File menu.
   */
  createNewPage: () => void;

  /**
   * Ask renderer to open a new tab, optionally at a specific path.
   * Triggered by Cmd/Ctrl+T on the main window and menu actions that need a fresh tab.
   */
  createNewTab: (data?: { path: string }) => void;

  /**
   * Ask renderer to create a new topic (start a new conversation).
   * Triggered from the main process File menu.
   */
  createNewTopic: () => void;

  /**
   * Ask renderer to go back in navigation history.
   * Triggered from the main process menu.
   */
  historyGoBack: () => void;

  /**
   * Ask renderer to go forward in navigation history.
   * Triggered from the main process menu.
   */
  historyGoForward: () => void;

  /**
   * Ask renderer to navigate within the SPA without reloading the whole page.
   * `workspaceId` names the scope the path belongs to (`null` is the personal space); the
   * renderer switches to it first. Absent, the path opens in the active scope.
   */
  navigate: (data: {
    escape?: boolean;
    path: string;
    replace?: boolean;
    workspaceId?: string | null;
  }) => void;

  /**
   * Ask renderer to open the add-friend dialog.
   * Triggered from the main process menu.
   */
  openAddFriend: () => void;

  /** Ask the renderer to open the all-agents surface. */
  openAllAgents: () => void;

  /**
   * Ask renderer to open its current workspace (or personal home) in a new window.
   * Triggered from the main process File menu.
   */
  openNewWindow: () => void;

  /** Ask the renderer to open the Recently Viewed surface. */
  openRecentlyViewed: () => void;
}
