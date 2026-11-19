import { copyToClipboard, toast } from '@lobehub/ui';
import type { ChannelListItem } from '@lobot/types';
import { CHANNEL_LIMITS } from '@lobot/types';
import {
  Archive,
  ArchiveRestore,
  Bell,
  BellOff,
  Copy,
  PencilLine,
  Pin,
  PinOff,
  Trash,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { openRenameModal } from '@/components/RenameModal';
import { channelActions } from '@/store/channel';
import { isTrpcErrorCode } from '@/utils/trpcError';

import { useChannelArchive } from './useChannelArchive';
import { useChannelSections } from './useChannelSections';
import { useDeletePeerChat } from './useDeletePeerChat';
import { useRemoveChannel } from './useRemoveChannel';

/**
 * A Channel's menu wherever it is listed: pin, mute, file under a section, rename, copy id,
 * archive, and move to the trash. A conversation between two people is a private chat instead:
 * pin, mute, file under a section, and delete it for me only.
 */
export const useChannelMenu = () => {
  const { t } = useTranslation('channel');
  const remove = useRemoveChannel();
  const deletePeerChat = useDeletePeerChat();
  const { archive, unarchive } = useChannelArchive();
  const sections = useChannelSections();

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
    sfSymbol: channel.pinnedAt ? 'pin.slash' : 'pin',
  });

  const toggleMute = async (channel: ChannelListItem) => {
    try {
      await channelActions.setMuted(channel.id, !channel.mutedAt);
    } catch (error) {
      console.error('Failed to mute Channel', error);
      toast.error(t('actionFailed'));
    }
  };

  // Each member mutes it for themselves; @mentions still notify.
  const muteItem = (channel: ChannelListItem) => ({
    icon: channel.mutedAt ? Bell : BellOff,
    key: channel.mutedAt ? 'unmute' : 'mute',
    label: t(channel.mutedAt ? 'unmuteNotifications' : 'muteNotifications'),
    onClick: () => void toggleMute(channel),
    sfSymbol: channel.mutedAt ? 'bell' : 'bell.slash',
  });

  // Both people own the conversation, so renaming, archiving or trashing it would change it for
  // the other person too.
  // Each member files it under their own sections.
  const sectionItems = (channel: ChannelListItem) => {
    const item = sections.menuItem(channel);
    return item ? [item] : [];
  };

  const peerItems = (channel: ChannelListItem) => [
    pinItem(channel),
    muteItem(channel),
    ...sectionItems(channel),
    { type: 'divider' as const },
    {
      danger: true,
      icon: Trash,
      key: 'deleteChat',
      label: t('deleteChat'),
      onClick: () => deletePeerChat(channel),
      sfSymbol: 'trash',
    },
  ];

  const channelItems = (channel: ChannelListItem) => [
    pinItem(channel),
    muteItem(channel),
    ...sectionItems(channel),
    // The person's own list settings above, the Channel itself below.
    { type: 'divider' as const },
    ...(channel.canDelete && channel.status !== 'archived'
      ? [
          {
            icon: PencilLine,
            key: 'rename',
            label: t('rename'),
            onClick: () => rename(channel),
            sfSymbol: 'pencil',
          },
        ]
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
      sfSymbol: 'doc.on.doc',
    },
    ...(channel.canDelete
      ? [
          channel.status === 'archived'
            ? {
                icon: ArchiveRestore,
                key: 'unarchive',
                label: t('unarchive'),
                onClick: () => void unarchive(channel.id),
                sfSymbol: 'tray.and.arrow.up',
              }
            : {
                icon: Archive,
                key: 'archive',
                label: t('archive'),
                onClick: () => archive(channel),
                sfSymbol: 'archivebox',
              },
          { type: 'divider' as const },
          {
            danger: true,
            icon: Trash,
            key: 'delete',
            label: t('moveToTrash'),
            onClick: () => remove(channel),
            sfSymbol: 'trash',
          },
        ]
      : []),
  ];

  return (channel: ChannelListItem) =>
    channel.peerUserId ? peerItems(channel) : channelItems(channel);
};
