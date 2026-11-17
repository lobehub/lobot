import { and, eq, sql } from 'drizzle-orm';

import type { ChannelMessageItem } from '../../schemas';
import { channelMessages } from '../../schemas';
import type { Transaction } from '../../type';
import { assertThreadOpen, findThread } from './delivery';
import { ChannelError } from './error';
import { audit } from './transaction';

const findMessage = async (tx: Transaction, channelId: string, messageId: string) => {
  const [message] = await tx
    .select()
    .from(channelMessages)
    .where(and(eq(channelMessages.channelId, channelId), eq(channelMessages.id, messageId)));
  if (!message) throw new ChannelError('NOT_FOUND', 'Message not found');

  return message;
};

/** Sends an `unassigned` message back to the decision model under a new attempt number. */
export const retryRouting = async (
  tx: Transaction,
  channelId: string,
  messageId: string,
): Promise<ChannelMessageItem> => {
  const message = await findMessage(tx, channelId, messageId);
  assertThreadOpen(await findThread(tx, channelId, message.threadId));
  if (message.routingStatus !== 'unassigned')
    throw new ChannelError('CONFLICT', 'Only an unassigned message can be routed again');

  const [retried] = await tx
    .update(channelMessages)
    .set({
      routingAttempt: sql`${channelMessages.routingAttempt} + 1`,
      routingReason: null,
      routingSource: null,
      routingStatus: 'pending',
    })
    .where(eq(channelMessages.id, messageId))
    .returning();
  await audit(tx, channelId, 'routing_retried', messageId, { attempt: retried.routingAttempt });

  return { ...retried, content: message.content };
};
