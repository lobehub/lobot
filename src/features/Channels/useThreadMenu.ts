import { CHANNEL_URL } from '@lobechat/const';
import { copyToClipboard, toast } from '@lobehub/ui';
import type { ChannelListItem, ChannelPublicThread } from '@lobot/types';
import { Archive, ArchiveRestore, Copy, Link2, Trash } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { useActiveWorkspaceSlug } from '@/business/client/hooks/useActiveWorkspaceSlug';
import { buildWorkspaceAwarePath } from '@/features/Workspace/workspaceAwarePath';
import { useAppOrigin } from '@/hooks/useAppOrigin';

import { useChannelArchive } from './useChannelArchive';
import { useRemoveThread } from './useRemoveThread';

/** Thread actions shared by the open thread's header and its page. */
export const useThreadMenu = () => {
  const { t } = useTranslation('channel');
  const removeThread = useRemoveThread();
  const { setThreadArchived } = useChannelArchive();
  const appOrigin = useAppOrigin();
  const slug = useActiveWorkspaceSlug();

  const copy = async (text: string, success: string) => {
    try {
      await copyToClipboard(text);
      toast.success(success);
    } catch (error) {
      console.error('Failed to copy thread', error);
      toast.error(t('actionFailed'));
    }
  };

  // Anyone who can see a thread can share it; only managers change it. Archive leads the menu
  // as the most frequent manager action; delete stays last, apart from the rest.
  return (channel: ChannelListItem, thread: ChannelPublicThread) => {
    // An archived channel is read-only as a whole, its threads included.
    const canManage = channel.canDelete && channel.status !== 'archived';
    return [
      ...(canManage
        ? [
            thread.status === 'archived'
              ? {
                  icon: ArchiveRestore,
                  key: 'unarchiveThread',
                  label: t('unarchiveThread'),
                  onClick: () => void setThreadArchived(channel.id, thread.id, false),
                }
              : {
                  icon: Archive,
                  key: 'archiveThread',
                  label: t('archiveThread'),
                  onClick: () => void setThreadArchived(channel.id, thread.id, true),
                },
            { type: 'divider' as const },
          ]
        : []),
      {
        icon: Link2,
        key: 'copyThreadLink',
        label: t('copyThreadLink'),
        onClick: () =>
          copy(
            `${appOrigin}${buildWorkspaceAwarePath(CHANNEL_URL(channel.id, thread.id), slug)}`,
            t('copyThreadLinkSuccess'),
          ),
      },
      {
        icon: Copy,
        key: 'copyThreadId',
        label: t('copyThreadId'),
        onClick: () => copy(thread.id, t('copyThreadIdSuccess')),
      },
      ...(canManage
        ? [
            { type: 'divider' as const },
            {
              danger: true,
              icon: Trash,
              key: 'deleteThread',
              label: t('deleteThread'),
              onClick: () => removeThread(channel, thread.id),
            },
          ]
        : []),
    ];
  };
};
