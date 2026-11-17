import { CHANNEL_URL } from '@lobechat/const';
import type { ChannelDetail } from '@lobot/types';
import { Button } from '@lobehub/ui';
import { UserPlus } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { useWorkspaceAwareNavigate } from '@/features/Workspace/useWorkspaceAwareNavigate';

import { canInviteMembers } from '../channelAccess';
import { openInviteMembers } from '../CreateChannel';
import { MemberList, useMemberEntries } from '../MemberList';
import { peerName } from '../peerName';
import { FormCard } from './FormCard';

export function MembersSection({ detail }: { detail: ChannelDetail }) {
  const { t } = useTranslation('channel');
  const { channel, members } = detail;
  const entries = useMemberEntries(detail);
  const navigate = useWorkspaceAwareNavigate();
  const directAgent = channel.agentId
    ? entries.find((entry) => entry.member.agentId === channel.agentId)
    : undefined;

  return (
    <FormCard
      plain
      description={t('settings.members.description')}
      title={t('membersCount', { count: entries.length })}
      headerAction={
        canInviteMembers(channel) && (
          <Button
            icon={UserPlus}
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
          >
            {t('invite.title')}
          </Button>
        )
      }
    >
      <MemberList showDescription detail={detail} />
    </FormCard>
  );
}
