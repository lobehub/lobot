import { getOperationFinalRootId } from '@lobechat/conversation-flow';
import type { UIChatMessage, WorkSummaryItem } from '@lobot/types';

/**
 * Build a `rootOperationId -> works` index from the raw db messages. The server
 * attaches each round's Work summaries to its anchor message (keyed by
 * `metadata.work.rootOperationId`), so a single flat pass over the raw rows
 * reconstructs the lookup the in-message chips need — no dedicated fetch.
 */
const buildWorkSummaryIndex = (messages: UIChatMessage[]): Map<string, WorkSummaryItem[]> => {
  const index = new Map<string, WorkSummaryItem[]>();
  for (const message of messages) {
    const works = message.works;
    if (!works || works.length === 0) continue;
    // Prefer the anchor message's own stamp; fall back to the work event's
    // rootOperationId so the lookup key always matches what the chip resolves.
    const rootOperationId =
      getOperationFinalRootId(message.metadata) ?? works[0].event.rootOperationId;
    if (rootOperationId) index.set(rootOperationId, works);
  }
  return index;
};

// Memoize per dbMessages array identity so the pass runs once per snapshot,
// regardless of how many MessageWorks instances read from it.
const indexCache = new WeakMap<UIChatMessage[], Map<string, WorkSummaryItem[]>>();

const getWorkSummaryIndex = (messages: UIChatMessage[]): Map<string, WorkSummaryItem[]> => {
  let index = indexCache.get(messages);
  if (!index) {
    index = buildWorkSummaryIndex(messages);
    indexCache.set(messages, index);
  }
  return index;
};

/** Works for one round's chip, resolved by the display-resolved rootOperationId. */
export const getWorkSummariesByRootOperationId = (
  messages: UIChatMessage[],
  rootOperationId?: string | null,
): WorkSummaryItem[] =>
  rootOperationId ? (getWorkSummaryIndex(messages).get(rootOperationId) ?? []) : [];
