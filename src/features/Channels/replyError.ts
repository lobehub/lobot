import type {
  ChannelPublicMessage,
  ChannelReplyError,
  ChannelReplyErrorAction,
  ChannelReplyJob,
} from '@lobot/types';

const ACTIONS = new Set<ChannelReplyErrorAction>(['resume', 'retry', 'switch_device']);

/**
 * The failure a message reports when the server posted it as a reply's error card: the public
 * `replyError` field, or `metadata.replyError` when the server passes the metadata through.
 * Anything malformed reads as an ordinary message; unknown actions are dropped.
 */
export const messageReplyError = (
  message: Pick<ChannelPublicMessage, 'metadata' | 'replyError'>,
): ChannelReplyError | undefined => {
  const raw = (message.replyError ?? message.metadata?.replyError) as
    Partial<ChannelReplyError> | null | undefined;
  if (!raw || typeof raw !== 'object') return undefined;
  if (typeof raw.jobId !== 'string' || !raw.jobId) return undefined;
  if (typeof raw.summary !== 'string' || !raw.summary.trim()) return undefined;
  return {
    ...raw,
    actions: Array.isArray(raw.actions)
      ? [...new Set(raw.actions.filter((action) => ACTIONS.has(action)))]
      : [],
    attempts: typeof raw.attempts === 'number' ? raw.attempts : 1,
    jobId: raw.jobId,
    occurredAt: typeof raw.occurredAt === 'string' ? raw.occurredAt : '',
    summary: raw.summary,
  };
};

/**
 * Failed replies the server has not already posted an error card for among the loaded messages.
 * A server that predates the cards posts none, so its failures keep the job-based receipt.
 */
export const withoutReplyErrorCards = <T extends ChannelReplyJob>(
  jobs: T[],
  messages: Pick<ChannelPublicMessage, 'metadata' | 'replyError'>[],
) => {
  const carded = new Set(
    messages.map((message) => messageReplyError(message)?.jobId).filter(Boolean),
  );
  return carded.size ? jobs.filter((job) => !carded.has(job.id)) : jobs;
};
