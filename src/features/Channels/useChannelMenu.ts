import type { ChannelListItem } from '@lobechat/types';
import { CHANNEL_LIMITS } from '@lobechat/types';
import { copyToClipboard, toast } from '@lobehub/ui';
import { Archive, ArchiveRestore, Copy, PencilLine, Pin, PinOff, Trash } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { openRenameModal } from '@/components/RenameModal';
import { channelActions } from '@/store/channel';
import { isTrpcErrorCode } from '@/utils/trpcError';

import { useChannelArchive } from './useChannelArchive';
import { useDeletePeerChat } from './useDeletePeerChat';
import { useRemoveChannel } from './useRemoveChannel';

/**
 * A Channel's menu wherever it is listed: pin, rename, copy id, archive, and move to the trash.
 * A conversation between two people is a private chat instead: pin, and delete it for me only.
 */
export const useChannelMenu = () => {
  const { t } = useTranslation('channel');
  const remove = useRemoveChannel();
  const deletePeerChat = useDeletePeerChat();
  const { archive, unarchive } = useChannelArchive();

  const rename = (channel: ChannelListItem) =>
    openRenameModal({
      defaultValue: channel.title,
      maxLength: CHANNEL_LIMITS.titleLength,
      title: t('rename'),
      onSave: async (title) => {
        try {
          await channelActions.rename(channel.id, title);
        } catch (error) {
          console.error('Failed to rename Channel', error);
          toast.error(t(isTrpcErrorCode(error, 'FORBIDDEN') ? 'renameForbidden' : 'renameFailed'));
          throw error; // Keep the dialog open with the typed name.
        }
      },
    });

  const togglePin = async (channel: ChannelListItem) => {
    try {
      await channelActions.setPinned(channel.id, !channel.pinnedAt);
    } catch (error) {
      console.error('Failed to pin Channel', error);
      toast.error(t('actionFailed'));
    }
  };

  // Any member pins it, for their own list only.
  const pinItem = (channel: ChannelListItem) => ({
    icon: channel.pinnedAt ? PinOff : Pin,
    key: channel.pinnedAt ? 'unpin' : 'pin',
    label: t(channel.pinnedAt ? 'pinOff' : 'pin', { ns: 'common' }),
    onClick: () => void togglePin(channel),
  });

  // Both people own the conversation, so renaming, archiving or trashing it would change it for
  // the other person too.
  const peerItems = (channel: ChannelListItem) => [
    pinItem(channel),
    { type: 'divider' as const },
    {
      danger: true,
      icon: Trash,
      key: 'deleteChat',
      label: t('deleteChat'),
      onClick: () => deletePeerChat(channel),
    },
  ];

  const channelItems = (channel: ChannelListItem) => [
    pinItem(channel),
    ...(channel.canDelete && channel.status !== 'archived'
      ? [{ icon: PencilLine, key: 'rename', label: t('rename'), onClick: () => rename(channel) }]
      : []),
    {
      icon: Copy,
      key: 'copyId',
      label: t('copyId'),
      onClick: async () => {
        try {
          await copyToClipboard(channel.id);
          toast.success(t('copyIdSuccess'));
        } catch (error) {
          console.error('Failed to copy Channel id', error);
          toast.error(t('actionFailed'));
        }
      },
    },
    ...(channel.canDelete
      ? [
          channel.status === 'archived'
            ? {
                icon: ArchiveRestore,
                key: 'unarchive',
                label: t('unarchive'),
                onClick: () => void unarchive(channel.id),
              }
            : {
                icon: Archive,
                key: 'archive',
                label: t('archive'),
                onClick: () => archive(channel),
              },
          { type: 'divider' as const },
          {
            danger: true,
            icon: Trash,
            key: 'delete',
            label: t('moveToTrash'),
            onClick: () => remove(channel),
          },
        ]
      : []),
  ];

  return (channel: ChannelListItem) =>
    channel.peerUserId ? peerItems(channel) : channelItems(channel);
};
