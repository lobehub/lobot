import type { ChannelDetail, ChannelListItem } from '@lobot/types';

import { channelSelectors, useChannelStore } from '@/store/channel';
import { isTrpcErrorCode } from '@/utils/trpcError';

/** The Channel was removed, is out of reach (another workspace, revoked access) or never existed. */
export const isChannelGone = (error: unknown) =>
  isTrpcErrorCode(error, 'BAD_REQUEST') ||
  isTrpcErrorCode(error, 'NOT_FOUND') ||
  isTrpcErrorCode(error, 'FORBIDDEN') ||
  isTrpcErrorCode(error, 'UNAUTHORIZED');

/** Retain content during transport failures, but hide it once access is revoked. */
export const visibleChannelDetail = (cached: ChannelDetail | undefined, error: unknown) =>
  isChannelGone(error) ? undefined : cached;

/**
 * Before a conversation's first page arrives, its list row stands in for it, so opening it shows
 * an empty feed and a live input instead of a loading placeholder. A thread, an older page, or a
 * failed load has no stand-in.
 */
export const showsListedShell = ({
  before,
  error,
  loaded,
  threadId,
}: {
  before?: number;
  error?: unknown;
  loaded: boolean;
  threadId?: string | null;
}) => !loaded && !error && !threadId && before === undefined;

/**
 * Inviting needs an admin of an open Channel; archived Channels take no new members until
 * reopened. Inviting from a direct conversation, or from one between two people, starts a new
 * group instead of joining it; people share a group only in a workspace, so a conversation
 * between two people outside one offers no invite. A conversation with another person's shared
 * Agent offers none either.
 */
export const canInviteMembers = (
  channel: Pick<
    ChannelListItem,
    'canDelete' | 'peerUserId' | 'sharedAgent' | 'status' | 'workspaceId'
  >,
) =>
  canManageAgents(channel) &&
  !channel.sharedAgent &&
  (!channel.peerUserId || !!channel.workspaceId);

/** Changing where an Agent runs needs an admin of an open Channel. */
export const canManageAgents = (channel: Pick<ChannelListItem, 'canDelete' | 'status'>) =>
  channel.canDelete && channel.status !== 'archived';

/**
 * `canInviteMembers` for an open conversation. Only its list row marks a shared Agent's
 * conversation, so the loaded detail borrows that mark.
 */
export const useCanInviteMembers = (channel: ChannelDetail['channel']) => {
  const listedShared = useChannelStore(channelSelectors.listed(channel.id))?.sharedAgent;
  return canInviteMembers({ ...channel, sharedAgent: channel.sharedAgent || listedShared });
};
