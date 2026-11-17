import { useMemo } from 'react';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { cacheScope } from '@/libs/replica';

interface HiddenConversationsState {
  /** `${cacheScope}:${row key}` → when the person hid that row, in ms. */
  hiddenAt: Record<string, number>;
}

/**
 * Rows the person chose not to show in their Messages list, like WeChat's "Hide chat". Kept on
 * this device only, per user and workspace.
 */
export const useHiddenConversationStore = create<HiddenConversationsState>()(
  persist(() => ({ hiddenAt: {} }) as HiddenConversationsState, {
    name: 'LOBE_MESSAGE_LIST_HIDDEN',
    storage: createJSONStorage(() => localStorage),
  }),
);

const scopedKey = (scope: string, key: string) => `${scope}:${key}`;

export const hideConversation = (key: string, now = Date.now()) =>
  useHiddenConversationStore.setState((s) => ({
    hiddenAt: { ...s.hiddenAt, [scopedKey(cacheScope.get(), key)]: now },
  }));

export const showConversation = (key: string) => {
  const scoped = scopedKey(cacheScope.get(), key);
  if (!(scoped in useHiddenConversationStore.getState().hiddenAt)) return;
  useHiddenConversationStore.setState((s) => {
    const { [scoped]: _, ...hiddenAt } = s.hiddenAt;
    return { hiddenAt };
  });
};

/** When each row of the current user and workspace was hidden, keyed by row. */
export const useHiddenConversations = (): Map<string, number> => {
  const scope = cacheScope.use();
  const hiddenAt = useHiddenConversationStore((s) => s.hiddenAt);
  return useMemo(() => {
    const prefix = `${scope}:`;
    const map = new Map<string, number>();
    for (const [key, time] of Object.entries(hiddenAt)) {
      if (key.startsWith(prefix)) map.set(key.slice(prefix.length), time);
    }
    return map;
  }, [hiddenAt, scope]);
};
