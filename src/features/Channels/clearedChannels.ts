import { useMemo } from 'react';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { cacheScope } from '@/libs/replica';

interface ClearedChannelsState {
  /** `${cacheScope}:${channelId}` → the last Channel sequence the person cleared, inclusive. */
  clearedThrough: Record<string, number>;
}

/**
 * Conversations between two people that the person deleted, like WeChat's "Delete chat": the
 * messages up to then are cleared from their view on this device only. The other person, and the
 * server, keep everything.
 */
export const useClearedChannelStore = create<ClearedChannelsState>()(
  persist(() => ({ clearedThrough: {} }) as ClearedChannelsState, {
    name: 'LOBE_CHANNEL_CLEARED',
    storage: createJSONStorage(() => localStorage),
  }),
);

const scopedKey = (scope: string, channelId: string) => `${scope}:${channelId}`;

export const clearChannelLocally = (channelId: string, sequence: number) =>
  useClearedChannelStore.setState((s) => ({
    clearedThrough: { ...s.clearedThrough, [scopedKey(cacheScope.get(), channelId)]: sequence },
  }));

/** The last sequence the current user and workspace cleared in this Channel, if any. */
export const useClearedThrough = (channelId: string): number | undefined => {
  const scope = cacheScope.use();
  return useClearedChannelStore((s) => s.clearedThrough[scopedKey(scope, channelId)]);
};

/** Messages posted after the person cleared the conversation. */
export const useAfterCleared = <T extends { sequence: number }>(
  channelId: string,
  messages: T[] | undefined,
): { cleared: boolean; messages: T[] | undefined } => {
  const through = useClearedThrough(channelId);
  return useMemo(() => {
    if (through === undefined || !messages) return { cleared: false, messages };
    const kept = messages.filter((message) => message.sequence > through);
    return { cleared: kept.length < messages.length, messages: kept };
  }, [messages, through]);
};
