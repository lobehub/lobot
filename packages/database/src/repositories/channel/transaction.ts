import type { ChannelAuditDetails } from '@lobechat/types';
import { eq } from 'drizzle-orm';

import type { ChannelItem } from '../../schemas';
import { channelAudit, channels } from '../../schemas';
import type { Transaction } from '../../type';
import { ChannelError } from './error';

/**
 * Locks the channel row. Every channel write takes this lock before it touches any child
 * row, so writers always lock in the same order. The returned row is the latest version.
 */
export const lockChannel = async (tx: Transaction, channelId: string): Promise<ChannelItem> => {
  const [channel] = await tx
    .select()
    .from(channels)
    .where(eq(channels.id, channelId))
    .for('update');
  if (!channel) throw new ChannelError('NOT_FOUND', 'Channel not found');

  return channel;
};

export const audit = async (
  tx: Transaction,
  channelId: string,
  event: string,
  targetId: string,
  details: ChannelAuditDetails = {},
) => {
  await tx.insert(channelAudit).values({ channelId, details, event, targetId });
};
