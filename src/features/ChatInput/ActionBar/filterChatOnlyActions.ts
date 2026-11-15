import type { ActionKey, ActionKeys } from './config';

const CHAT_ONLY_ACTIONS = new Set<ActionKey>(['typo', 'voiceDictation']);

/**
 * Chat-only members (no configuration access) keep formatting and dictation
 * while the remaining actions are hidden.
 */
export const filterChatOnlyActions = (actions: ActionKeys[]): ActionKeys[] => {
  const visibleActions: ActionKeys[] = [];

  for (const action of actions) {
    if (Array.isArray(action)) {
      const visibleGroup = action.filter((item) => CHAT_ONLY_ACTIONS.has(item));
      if (visibleGroup.length > 0) visibleActions.push(visibleGroup);
      continue;
    }

    if (action === '---') {
      visibleActions.push(action);
      continue;
    }

    if (CHAT_ONLY_ACTIONS.has(action)) visibleActions.push(action);
  }

  return visibleActions;
};
