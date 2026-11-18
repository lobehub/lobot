import { confirmModal, toast } from '@lobehub/ui';
import type { ChannelListItem } from '@lobot/types';
import { useLatest } from 'ahooks';
import { useTranslation } from 'react-i18next';

import { useWorkspaceAwareNavigate } from '@/features/Workspace/useWorkspaceAwareNavigate';
import { useActiveLocationReader } from '@/hooks/useActiveLocation';
import { cacheScope } from '@/libs/replica';
import { channelActions } from '@/store/channel';
import { isTrpcErrorCode } from '@/utils/trpcError';

import { matchChannel } from './paths';

export const useRemoveChannel = () => {
  const { t } = useTranslation('channel');
  // Read where the person is when they confirm; subscribing would re-render every list row on navigation.
  const getLocation = useActiveLocationReader();
  const navigate = useWorkspaceAwareNavigate();
  const latest = useLatest({ getLocation, navigate });

  return (channel: ChannelListItem) => {
    // Trashing a conversation between two people would take it from the other person too.
    if (!channel.canDelete || channel.peerUserId) return;
    const scope = cacheScope.get();
    return confirmModal({
      cancelText: t('cancel'),
      content: t('moveToTrashConfirm', { title: channel.title }),
      okButtonProps: { danger: true },
      okText: t('moveToTrash'),
      title: t('moveToTrash'),
      onOk: async () => {
        try {
          // A confirmation belongs to the identity that opened it.
          if (cacheScope.get() !== scope) throw new Error('Channel scope changed');
          await channelActions.remove(channel.id);
        } catch (error) {
          console.error('Failed to delete Channel', error);
          toast.error(t(isTrpcErrorCode(error, 'FORBIDDEN') ? 'deleteForbidden' : 'deleteFailed'));
          throw error; // Keep the confirmation open so the user can retry or cancel.
        }
        if (cacheScope.get() !== scope) return;
        // Home holds the Channel list, a project's Channels included.
        if (matchChannel(latest.current.getLocation().pathname) === channel.id)
          latest.current.navigate('/', { replace: true });
        toast.success(t('moveToTrashSuccess'));
      },
    });
  };
};
