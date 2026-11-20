import { confirmModal, toast } from '@lobehub/ui';
import type { ChannelListItem, ChannelPublicMember } from '@lobot/types';
import { useTranslation } from 'react-i18next';

import { cacheScope } from '@/libs/replica';
import { channelActions } from '@/store/channel';

/** Confirms, then removes a person or an Agent from a group Channel. */
export const useRemoveMember = () => {
  const { t } = useTranslation('channel');
  return (
    channel: Pick<ChannelListItem, 'id' | 'projectId'>,
    member: ChannelPublicMember,
    name: string,
  ) => {
    const scope = cacheScope.get();
    return confirmModal({
      cancelText: t('cancel'),
      content: t(
        member.actorType === 'user'
          ? 'member.removeConfirmPerson'
          : channel.projectId
            ? 'member.removeConfirmAgent'
            : 'member.removeConfirmAgentStandalone',
      ),
      okButtonProps: { danger: true },
      okText: t('member.remove'),
      title: t('member.removeConfirmTitle', { name }),
      onOk: async () => {
        try {
          // A confirmation belongs to the identity that opened it.
          if (cacheScope.get() !== scope) throw new Error('Channel scope changed');
          await channelActions.removeMember(channel.id, member.id);
        } catch (error) {
          console.error('Failed to remove a Channel member', error);
          toast.error(t('member.removeFailed', { name }));
          throw error; // Keep the confirmation open so the user can retry or cancel.
        }
      },
    });
  };
};
