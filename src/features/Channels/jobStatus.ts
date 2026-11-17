import type { ChannelDetail, ChannelPublicJob, ChannelReplyJob } from '@lobot/types';
import type { AgentAvatarState } from '@lobehub/ui';

export const channelJobStatus = (job: ChannelReplyJob) =>
  job.publicationRevoked && job.writerHeld
    ? 'status.stopping'
    : job.status === 'queued'
      ? job.blockedCode
        ? (`blocked.${job.blockedCode}` as const)
        : 'status.preparing'
      : (`status.${job.status}` as const);

/** On a member's own row, a running reply is described by what the Agent is doing. */
export const memberJobStatus = (job: ChannelReplyJob) => {
  const status = channelJobStatus(job);
  return status === 'status.running' ? ('status.working' as const) : status;
};

/**
 * A follow-up deferred behind the message's primary responder. It starts only once that reply
 * settles and may well stay silent, so until then it is not a reply in progress.
 */
const isAwaitingPrimary = (job: ChannelReplyJob) =>
  job.status === 'queued' && job.blockedCode === 'awaiting_primary';

/** Colour family of a status: working blue, attention amber, error red, settled grey. */
export type ChannelStatusTone = 'attention' | 'done' | 'error' | 'quiet' | 'working';

export const channelJobTone = (job: ChannelReplyJob): ChannelStatusTone => {
  if (job.status === 'failed') return 'error';
  if (job.publicationRevoked) return job.writerHeld ? 'attention' : 'quiet';
  if (job.status === 'queued')
    return isAwaitingPrimary(job) ? 'quiet' : job.blockedCode ? 'attention' : 'working';
  if (job.status === 'running') return 'working';
  if (job.status === 'completed') return 'done';
  return 'quiet';
};

/**
 * A reply that failed because its device was offline or unreachable. The server files every
 * "no reachable run device" case under this one error type.
 */
export const isDeviceFailure = (job: Pick<ChannelPublicJob, 'errorType' | 'status'>) =>
  job.status === 'failed' && job.errorType === 'DeviceGatewayNotConfigured';

/** Still able to publish a reply, so the user can stop it. */
export const isChannelJobActive = (job: ChannelReplyJob) =>
  !job.publicationRevoked && (job.status === 'queued' || job.status === 'running');

/** Work the conversation is still waiting on: shown above the composer, not on messages. */
export const replyActivityJobs = <T extends ChannelReplyJob>(jobs: T[]) =>
  jobs.filter(
    (job) =>
      (isChannelJobActive(job) && !isAwaitingPrimary(job)) ||
      (job.publicationRevoked && job.writerHeld),
  );

/**
 * Each member's newest job when it failed. A later reply, stop or retry by the same member
 * settles the failure, so the header does not stay red forever. Jobs arrive newest first.
 */
export const unresolvedFailures = <T extends ChannelReplyJob>(jobs: T[]) => {
  const seen = new Set<string>();
  return jobs.filter((job) => {
    if (seen.has(job.memberId)) return false;
    seen.add(job.memberId);
    return job.status === 'failed';
  });
};

/**
 * The header's failures: the main conversation's own. Its view also carries replies still at
 * work in threads, and one of those must not hide, then bring back, a main-timeline failure.
 */
export const mainTimelineFailures = <T extends ChannelReplyJob>(jobs: T[]) =>
  unresolvedFailures(jobs.filter((job) => !job.threadId));

/** What a member is busy with now: a running reply first, then the next queued one. */
export const memberCurrentJob = <T extends ChannelReplyJob>(jobs: T[], memberId: string) => {
  const own = jobs.filter((job) => job.memberId === memberId);
  return (
    own.find((job) => isChannelJobActive(job) && job.status === 'running') ??
    own.find(isChannelJobActive) ??
    own.find((job) => job.publicationRevoked && job.writerHeld) ??
    unresolvedFailures(own)[0]
  );
};

/** Replies a conversation still waits on, and whether a sent message awaits routing. */
export const conversationReplies = (detail: ChannelDetail, threadId: string | null) => {
  const { jobs = [], messages = [] } = detail;
  return {
    jobs: replyActivityJobs(jobs.filter((job) => (job.threadId ?? null) === threadId)),
    receiving: messages.some((message) => message.routingStatus === 'pending'),
  };
};

/** Whether the conversation has a reply or routing in progress to show above the composer. */
export const hasReplyActivity = (detail: ChannelDetail, threadId: string | null) => {
  const { jobs, receiving } = conversationReplies(detail, threadId);
  return jobs.length > 0 || receiving;
};

/**
 * How a direct conversation's Agent avatar acts out its pending replies, in the main conversation
 * and its Threads alike: `working` while any of them writes, `thinking` while a message is routed
 * or a reply is prepared, `waiting` when every pending one is blocked or stopping. Undefined when
 * nothing is pending, so the avatar stays idle.
 */
export const replyAvatarState = (
  jobs: ChannelReplyJob[],
  receiving = false,
): AgentAvatarState | undefined => {
  const pending = replyActivityJobs(jobs);
  if (pending.some((job) => isChannelJobActive(job) && job.status === 'running')) return 'working';
  if (receiving || pending.some((job) => channelJobTone(job) === 'working')) return 'thinking';
  return pending.length > 0 ? 'waiting' : undefined;
};

/** The avatar state of a loaded direct conversation, Threads included; see `replyAvatarState`. */
export const directAvatarState = (detail: ChannelDetail) =>
  replyAvatarState(
    detail.jobs ?? [],
    (detail.messages ?? []).some((message) => message.routingStatus === 'pending'),
  );

/**
 * How many conversations an Agent is working in at once: the main one and each Thread with a
 * reply running or about to, counted once however many replies it holds. Blocked, stopping and
 * deferred replies do not count. Given a member, only that member's replies count.
 */
/** The conversations a member works in at once: `null` is the main one, the rest Thread ids. */
export const workingConversations = (jobs: ChannelReplyJob[], memberId?: string) => [
  ...new Set(
    replyActivityJobs(jobs)
      .filter(
        (job) => channelJobTone(job) === 'working' && (!memberId || job.memberId === memberId),
      )
      .map((job) => job.threadId ?? null),
  ),
];

export const workingConversationCount = (jobs: ChannelReplyJob[], memberId?: string) =>
  workingConversations(jobs, memberId).length;

/**
 * The reply a member (or, without one, the first replying member) is visibly working on: running
 * or about to, not blocked, stopping or deferred. Undefined when nobody is.
 */
export const workingJob = <T extends ChannelReplyJob>(jobs: T[], memberId?: string) => {
  const pending = replyActivityJobs(jobs);
  const owner = memberId ?? pending[0]?.memberId;
  const job = owner ? memberCurrentJob(pending, owner) : undefined;
  return job && channelJobTone(job) === 'working' ? job : undefined;
};
