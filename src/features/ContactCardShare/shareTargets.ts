import type { ChannelListItem, ContactCardInput } from '@lobot/types';

import { groupChannelName } from '@/features/Channels/channelName';

/** A conversation a card can be sent to, under the name its list row shows. */
export interface ShareChannelTarget {
  avatar: string | null;
  backgroundColor?: string | null;
  channel: ChannelListItem;
  /** Who the avatar pictures: a person, an Agent, or a group Channel. */
  kind: 'agent' | 'group' | 'user';
  name: string;
}

const activity = (channel: ChannelListItem) =>
  new Date(channel.lastMessage?.createdAt ?? channel.updatedAt ?? channel.createdAt).getTime();

/**
 * The open conversations a card can be sent to, most recent first: a conversation of two by the
 * other side, a project's default Channel by its project, any other by its title. The
 * conversation with the shared Agent or person itself is left out; the card would only point
 * back at it.
 */
export const buildShareTargets = (
  channels: ChannelListItem[],
  projectName: (projectId: string) => string | undefined,
  card?: ContactCardInput,
): ShareChannelTarget[] =>
  channels
    .filter((channel) => channel.status === 'active')
    .filter((channel) =>
      card?.type === 'agent'
        ? channel.agentId !== card.agentId
        : card?.type === 'user'
          ? channel.peerUserId !== card.userId
          : true,
    )
    .toSorted((a, b) => activity(b) - activity(a))
    .map((channel) => {
      const direct = !!channel.peerUserId || !!channel.agentId;
      const counterpart = direct
        ? channel.memberAvatars?.find((member) =>
            channel.peerUserId ? member.actorType === 'user' : member.actorType === 'agent',
          )
        : undefined;
      return {
        avatar: counterpart?.avatar ?? null,
        backgroundColor: counterpart?.backgroundColor,
        channel,
        kind: !direct ? 'group' : channel.peerUserId ? 'user' : 'agent',
        name:
          counterpart?.name ||
          groupChannelName(channel, channel.projectId ? projectName(channel.projectId) : undefined),
      };
    });

/** Conversations whose name contains the query, case-insensitively; all of them when empty. */
export const filterShareTargets = (targets: ShareChannelTarget[], query: string) => {
  const needle = query.trim().toLowerCase();
  return needle ? targets.filter((target) => target.name.toLowerCase().includes(needle)) : targets;
};
