import { CHANNEL_URL } from '@lobechat/const';
import { ActionIcon } from '@lobehub/ui';
import type { ChannelDetail } from '@lobot/types';
import { UserPlus } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { useWorkspaceAwareNavigate } from '@/features/Workspace/useWorkspaceAwareNavigate';

import { useCanInviteMembers } from './channelAccess';
import { openInviteMembers } from './CreateChannel';
import { useMemberEntries } from './MemberList';
import { peerName } from './peerName';

/** Adds people or Agents; nothing for a member who cannot invite. */
export function InviteMembersButton({ detail }: { detail: ChannelDetail }) {
  const { t } = useTranslation('channel');
  const navigate = useWorkspaceAwareNavigate();
  const { channel, members = [] } = detail;
  const canInvite = useCanInviteMembers(channel);
  const entries = useMemberEntries(detail);
  if (!canInvite) return null;

  const directAgent = channel.agentId
    ? entries.find((entry) => entry.member.agentId === channel.agentId)
    : undefined;

  return (
    <ActionIcon
      aria-label={t('invite.title')}
      icon={UserPlus}
      size="small"
      title={t('invite.title')}
      onClick={() =>
        openInviteMembers(
          {
            agentIds: members.flatMap((member) =>
              member.status === 'active' && member.agentId ? [member.agentId] : [],
            ),
            directAgentName: channel.agentId ? (directAgent?.name ?? '') : undefined,
            id: channel.id,
            peer: channel.peerUserId
              ? { name: peerName(channel), userId: channel.peerUserId }
              : undefined,
            peopleCount: members.filter(
              (member) => member.status === 'active' && member.actorType === 'user',
            ).length,
            workspaceId: channel.workspaceId,
          },
          // Inviting from a one-to-one conversation opens the group it starts.
          (id) => navigate(CHANNEL_URL(id)),
        )
      }
    />
  );
}
