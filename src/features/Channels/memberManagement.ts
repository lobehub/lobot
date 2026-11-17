import type { ChannelListItem, ChannelMemberRole, ChannelPublicMember } from '@lobechat/types';

import { isCurrentUserMember } from './memberName';

type GroupChannel = Pick<ChannelListItem, 'agentId' | 'canDelete' | 'peerUserId' | 'status'>;

/** A direct or person-to-person conversation is defined by its two sides; no one joins or leaves. */
const isGroup = (channel: GroupChannel) => !channel.agentId && !channel.peerUserId;

/**
 * Whether the caller may remove `member`: an admin of a group Channel, never the owner or
 * themselves, and only the owner removes another admin. The server enforces the same rule.
 */
export const canRemoveMember = (
  channel: GroupChannel,
  member: Pick<ChannelPublicMember, 'role' | 'status'>,
  options: { isSelf: boolean; selfRole: ChannelMemberRole | null | undefined },
) =>
  isGroup(channel) &&
  channel.canDelete &&
  member.status === 'active' &&
  !options.isSelf &&
  member.role !== 'owner' &&
  (member.role !== 'admin' || options.selfRole === 'owner');

/** The caller's role among a Channel's members; undefined when they are not one of them. */
export const callerMemberRole = (
  members: Pick<ChannelPublicMember, 'actorType' | 'role' | 'userId'>[] | undefined,
  userId: string | undefined,
) => members?.find((member) => isCurrentUserMember(member, userId))?.role;
