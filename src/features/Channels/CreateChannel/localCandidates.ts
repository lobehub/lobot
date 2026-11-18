import type { ChannelPublicMember } from '@lobot/types';

import type { WorkspaceMemberWithProfile } from '@/business/client/hooks/useWorkspaceMembers';
import type { ChannelPersonOption } from '@/services/channel';

/** The server returns at most this many candidates; searching narrows the rest. */
export const CANDIDATE_LIMIT = 50;

const sortName = (person: ChannelPersonOption) => person.fullName ?? '￿';

/**
 * The invite candidates the server would answer (`channel.userCandidates`), worked out from the
 * workspace roster replica so the picker paints at once instead of waiting on the network.
 * `exclude` are the people already in the Channel, or the creator for a new one.
 */
export const localUserCandidates = (
  roster: WorkspaceMemberWithProfile[],
  exclude: ReadonlySet<string>,
  search: string,
): ChannelPersonOption[] => {
  const query = search.trim().toLocaleLowerCase();
  return roster
    .filter((member) => !member.deletedAt && !exclude.has(member.userId))
    .map((member) => ({
      avatar: member.user?.avatar ?? null,
      fullName: member.user?.fullName ?? null,
      userId: member.userId,
      username: member.user?.username ?? null,
    }))
    .filter(
      (person) =>
        !query ||
        [person.fullName, person.username].some((name) =>
          name?.toLocaleLowerCase().includes(query),
        ),
    )
    .sort(
      (a, b) =>
        sortName(a).localeCompare(sortName(b)) ||
        (a.userId < b.userId ? -1 : +(a.userId > b.userId)),
    )
    .slice(0, CANDIDATE_LIMIT);
};

/** People already active in the Channel, whom the invite list leaves out. */
export const activeUserIds = (members: ChannelPublicMember[]) =>
  members.flatMap((member) =>
    member.actorType === 'user' && member.status === 'active' && member.userId
      ? [member.userId]
      : [],
  );
