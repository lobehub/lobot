import type { ChannelListItem } from '@lobechat/types';
import { confirmModal, toast } from '@lobehub/ui';
import { useLatest } from 'ahooks';
import { useTranslation } from 'react-i18next';

import { hideConversation } from '@/features/MessageList/hiddenConversations';
import { useWorkspaceAwareNavigate } from '@/features/Workspace/useWorkspaceAwareNavigate';
import { useActiveLocation } from '@/hooks/useActiveLocation';
import { cacheScope } from '@/libs/replica';
import { channelActions } from '@/store/channel';

import { clearChannelLocally } from './clearedChannels';
import { matchChannel } from './paths';
import { peerName } from './peerName';

/**
 * Deletes a conversation between two people for the viewer only, like WeChat: its history is
 * cleared on this device and its row leaves the list until a new message arrives. The other
 * person keeps the conversation and every message.
 */
export const useDeletePeerChat = () => {
  const { t } = useTranslation('channel');
  const location = useActiveLocation();
  const navigate = useWorkspaceAwareNavigate();
  const latest = useLatest({ location, navigate });

  return (channel: ChannelListItem) => {
    if (!channel.peerUserId) return;
    const scope = cacheScope.get();
    return confirmModal({
      cancelText: t('cancel'),
      content: t('deleteChatConfirm', { name: peerName(channel) }),
      okButtonProps: { danger: true },
      okText: t('deleteChat'),
      title: t('deleteChat'),
      onOk: () => {
        // A confirmation belongs to the identity that opened it.
        if (cacheScope.get() !== scope) return;
        if (matchChannel(latest.current.location.pathname) === channel.id)
          latest.current.navigate('/', { replace: true });
        clearChannelLocally(channel.id, channel.sequence);
        hideConversation(channel.id);
        // What was cleared is not unread any more.
        void channelActions
          .markRead(channel.id, channel.sequence)
          .catch((error: unknown) => console.error('Failed to mark Channel read', error));
        toast.success(t('deleteChatSuccess'));
      },
    });
  };
};
