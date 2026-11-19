import type { ChannelPublicMessage } from '@lobot/types';

import AgentAvatar from '@/components/AgentAvatar';
import PersonAvatar from '@/components/UserAvatar';

/**
 * A message author's avatar outside the timeline (thread lists, search hits). Without an image of
 * their own, a person draws the pixel avatar generated from their name and an Agent the character
 * generated from its id, the same faces the message list and the timeline show.
 */
export function AuthorAvatar({
  author,
  size,
}: {
  author: Pick<ChannelPublicMessage['author'], 'avatar' | 'id' | 'name' | 'type'>;
  size: number;
}) {
  return author.type === 'agent' ? (
    <AgentAvatar
      agentId={author.id}
      avatar={author.avatar}
      name={author.name}
      shape={'circle'}
      size={size}
      title={author.name ?? undefined}
    />
  ) : (
    <PersonAvatar avatar={author.avatar} name={author.name} shape={'circle'} size={size} />
  );
}
