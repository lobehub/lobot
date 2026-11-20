import { useSyncExternalStore } from 'react';

/** A request to scroll a conversation to one message, made from outside it (e.g. search). */
export interface ChannelJumpRequest {
  channelId: string;
  id: string;
  /** Distinguishes repeated jumps to the same message. */
  nonce: number;
  sequence: number;
  threadId: string | null;
}

let pending: ChannelJumpRequest | null = null;
let nonce = 0;
const listeners = new Set<() => void>();
const emit = () => {
  for (const listener of listeners) listener();
};
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

/** Asks the conversation showing `threadId` (null: the main one) to reveal the message. */
export const requestChannelJump = (request: Omit<ChannelJumpRequest, 'nonce'>) => {
  nonce += 1;
  pending = { ...request, nonce };
  emit();
};

/** The conversation took the request; a later mount of it must not jump again. */
export const consumeChannelJump = (request: ChannelJumpRequest) => {
  if (pending?.nonce !== request.nonce) return;
  pending = null;
  emit();
};

/** The pending jump addressed to this conversation, if any. */
export const useChannelJump = (channelId: string, threadId: string | null) =>
  useSyncExternalStore(subscribe, () =>
    pending?.channelId === channelId && pending.threadId === threadId ? pending : null,
  );

const MESSAGE_PARAM = 'message';
const SEQUENCE_PARAM = 'sequence';

/**
 * The message a link asked to reveal. `sequence` has to be a whole number: anything else is not a
 * location, and the address is left alone.
 */
export const readChannelMessageLink = (
  params: URLSearchParams,
): Pick<ChannelJumpRequest, 'id' | 'sequence' | 'threadId'> | null => {
  const id = params.get(MESSAGE_PARAM);
  const sequence = params.get(SEQUENCE_PARAM);
  if (!id || sequence === null || !/^\d+$/.test(sequence)) return null;
  return { id, sequence: Number(sequence), threadId: params.get('thread') };
};

/** Removes the message location once the conversation has been asked to reveal it. */
export const omitChannelMessageLink = (params: URLSearchParams) => {
  const next = new URLSearchParams(params);
  next.delete(MESSAGE_PARAM);
  next.delete(SEQUENCE_PARAM);
  return next;
};
