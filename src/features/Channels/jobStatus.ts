import { classifyCliQuotaMessage } from '@lobechat/heterogeneous-agents/errors';
import type { AgentAvatarState } from '@lobehub/ui';
import type { ChannelDetail, ChannelPublicJob, ChannelReplyJob } from '@lobot/types';

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

/**
 * Blocks that only wait their turn: behind the primary responder, behind the Agent's own earlier
 * reply, or for its working directory. They clear by themselves, so they read as waiting, not as
 * something a person must step in for.
 */
const SELF_CLEARING_BLOCKS = new Set<ChannelReplyJob['blockedCode']>([
  'awaiting_primary',
  'directory_locked',
  'member_busy',
]);

/** Family of a status: working, waiting (quiet), needs a person (attention), failed, settled. */
export type ChannelStatusTone = 'attention' | 'done' | 'error' | 'quiet' | 'working';

export const channelJobTone = (job: ChannelReplyJob): ChannelStatusTone => {
  if (job.status === 'failed') return 'error';
  if (job.publicationRevoked) return job.writerHeld ? 'attention' : 'quiet';
  if (job.status === 'queued')
    return !job.blockedCode
      ? 'working'
      : SELF_CLEARING_BLOCKS.has(job.blockedCode)
        ? 'quiet'
        : 'attention';
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

/**
 * A reply that failed because the Agent's own CLI subscription is spent (`You've hit your 5-hour
 * limit · resets 4pm`). Running it again only hits the same limit until the window resets.
 */
export const isQuotaFailure = (job: Pick<ChannelPublicJob, 'errorMessage' | 'status'>) =>
  job.status === 'failed' && !!classifyCliQuotaMessage(job.errorMessage ?? undefined);

/** Still able to publish a reply, so the user can stop it. */
export const isChannelJobActive = (job: ChannelReplyJob) =>
  !job.publicationRevoked && (job.status === 'queued' || job.status === 'running');

/**
 * The reply a queued one waits behind: the oldest active reply of the same member in the same
 * branch, when it is older than this one. The server writes `blockedCode` only on a job it tried
 * to claim, so a request queued behind another reply of the same Agent carries none and would
 * otherwise read as typing. Jobs arrive newest first.
 *
 * The server keeps requests from different requesters apart when no Channel device is pinned,
 * but the public job does not say who asked, so this is per member and branch.
 */
export const queueHead = <T extends ChannelReplyJob>(job: T, jobs: T[]): T | undefined => {
  if (job.status !== 'queued' || job.blockedCode || !isChannelJobActive(job)) return undefined;
  const index = jobs.findIndex((entry) => entry.id === job.id);
  if (index === -1) return undefined;
  return jobs
    .slice(index + 1)
    .findLast(
      (entry) =>
        entry.memberId === job.memberId &&
        (entry.threadId ?? null) === (job.threadId ?? null) &&
        isChannelJobActive(entry),
    );
};

/** A queue head blocked on its device: the replies behind it wait for that device too. */
export const isDeviceBlocked = (job: ChannelReplyJob) =>
  job.status === 'queued' && job.blockedCode === 'device_offline';

/**
 * A reply's status among the conversation's replies: one queued behind an earlier reply of the
 * same Agent waits for it (or for the device that reply waits for) instead of typing.
 */
export const replyJobStatus = (job: ChannelReplyJob, jobs: ChannelReplyJob[]) => {
  const head = queueHead(job, jobs);
  if (!head) return channelJobStatus(job);
  return isDeviceBlocked(head)
    ? ('queue.waitingDevice' as const)
    : ('blocked.member_busy' as const);
};

/**
 * The tone of `replyJobStatus`. A reply waiting in line is quiet whatever holds up the reply ahead:
 * that reply's own row says why. Only one waiting for a named device needs the user, so it asks
 * for attention.
 */
export const replyJobTone = (job: ChannelReplyJob, jobs: ChannelReplyJob[]): ChannelStatusTone => {
  const head = queueHead(job, jobs);
  if (!head) return channelJobTone(job);
  return isDeviceBlocked(head) ? 'attention' : 'quiet';
};

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

/**
 * What a member is busy with now: a running reply first, then the head of its queue, the oldest
 * queued one, which the newer ones wait behind. Jobs arrive newest first.
 */
export const memberCurrentJob = <T extends ChannelReplyJob>(jobs: T[], memberId: string) => {
  const own = jobs.filter((job) => job.memberId === memberId);
  return (
    own.find((job) => isChannelJobActive(job) && job.status === 'running') ??
    own.findLast(isChannelJobActive) ??
    own.find((job) => job.publicationRevoked && job.writerHeld) ??
    unresolvedFailures(own)[0]
  );
};

/**
 * Replies a conversation still waits on. A sent message still being routed shows nothing here:
 * the line appears once a named Agent takes the message up.
 */
export const conversationReplies = (detail: ChannelDetail, threadId: string | null) =>
  replyActivityJobs((detail.jobs ?? []).filter((job) => (job.threadId ?? null) === threadId));

/** Whether the conversation has a reply in progress to show above the composer. */
export const hasReplyActivity = (detail: ChannelDetail, threadId: string | null) =>
  conversationReplies(detail, threadId).length > 0;

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
  if (receiving || pending.some((job) => replyJobTone(job, pending) === 'working'))
    return 'thinking';
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
export const workingConversations = (jobs: ChannelReplyJob[], memberId?: string) => {
  const pending = replyActivityJobs(jobs);
  return [
    ...new Set(
      pending
        .filter(
          (job) =>
            replyJobTone(job, pending) === 'working' && (!memberId || job.memberId === memberId),
        )
        .map((job) => job.threadId ?? null),
    ),
  ];
};

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
