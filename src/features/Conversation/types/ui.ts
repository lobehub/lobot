import { type ActionIconGroupItemType } from '@lobehub/ui';

/**
 * Action item with click handler
 */
export interface MessageActionItem extends ActionIconGroupItemType {
  /**
   * Submenu entries. Full actions rather than a narrower shape: a nested item
   * carries the same icon and label as it would at the top level, since the
   * same registered action can appear either way.
   */
  children?: MessageActionItem[];
  handleClick?: () => void | Promise<void>;
}

/**
 * Action item or divider
 */
export type MessageActionItemOrDivider = MessageActionItem | { type: 'divider' };

/**
 * Action slot reference. A registered action key (e.g. `'copy'`) or the
 * reserved `'divider'` literal.
 *
 * Uses declarative keys rather than pre-built items so per-message action
 * construction stays lazy and per-session/role config lives at the route
 * layer (see `useActionsBarConfig`).
 */
type MessageActionSlot = string;

/**
 * Action configuration for a specific message type. Lists of registered
 * action keys resolved at render-time against the action registry.
 */
export interface MessageActionsConfig {
  /** Bar slots (always visible as icons) */
  bar?: MessageActionSlot[];
  /** Menu slots (overflow dropdown); when omitted the role's default menu is used */
  menu?: MessageActionSlot[];
}

/**
 * Actions bar configuration by message type
 */
export interface ActionsBarConfig {
  /**
   * Actions configuration for assistant messages
   */
  assistant?: MessageActionsConfig;
  /**
   * Actions configuration for assistant group messages
   * If not provided, falls back to `assistant` config
   */
  assistantGroup?: MessageActionsConfig;
  /**
   * Actions configuration for user messages
   */
  user?: MessageActionsConfig;
}
