import type { ContactCardInput } from '@lobot/types';

import { shareAgentErrorKey, shareUserErrorKey } from './shareErrors';

export type ShareErrorKey = ReturnType<typeof shareAgentErrorKey | typeof shareUserErrorKey>;

export interface ShareSendResult {
  /** Why the rest did not go, when one failed. */
  errorKey?: ShareErrorKey;
  /** The conversations the card reached, in the order they were sent. */
  sent: string[];
}

/**
 * Sends the card to each conversation in turn, then the note after it, as a chat app forwards a
 * contact card with a message. A refusal of the card itself (not shareable, gone) would refuse
 * every conversation alike, so it stops there; an ordinary failure moves on to the next one.
 */
export const sendCardToChannels = async ({
  card,
  channelIds,
  note,
  sendCard,
  sendNote,
}: {
  card: ContactCardInput;
  channelIds: string[];
  note: string;
  sendCard: (channelId: string) => Promise<unknown>;
  sendNote: (channelId: string, content: string) => unknown;
}): Promise<ShareSendResult> => {
  const errorKeyOf = card.type === 'user' ? shareUserErrorKey : shareAgentErrorKey;
  const content = note.trim();
  const sent: string[] = [];
  let errorKey: ShareErrorKey | undefined;

  for (const channelId of channelIds) {
    try {
      await sendCard(channelId);
    } catch (error) {
      console.error('[channel] Failed to share the contact card', error);
      errorKey = errorKeyOf(error);
      if (errorKey === 'contactCard.error.failed') continue;
      break;
    }
    sent.push(channelId);
    // The note follows its card and retries on its own, like any message being sent.
    if (content) void sendNote(channelId, content);
  }

  return { errorKey, sent };
};
