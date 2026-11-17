import type { ChannelListItem } from '@lobechat/types';
import { Button } from '@lobehub/ui';
import { useTranslation } from 'react-i18next';

import { useChannelArchive } from '../useChannelArchive';
import { useDeletePeerChat } from '../useDeletePeerChat';
import { useRemoveChannel } from '../useRemoveChannel';
import { FormCard } from './FormCard';

export function DangerSection({ channel }: { channel: ChannelListItem }) {
  const { t } = useTranslation('channel');
  const { archive, unarchive } = useChannelArchive();
  const remove = useRemoveChannel();
  const deletePeerChat = useDeletePeerChat();
  const archived = channel.status === 'archived';

  // Both people own a conversation between them, so it is deleted for me only, never archived or
  // trashed.
  if (channel.peerUserId)
    return (
      <FormCard
        danger
        description={t('settings.danger.deleteChatHint')}
        title={t('deleteChat')}
        action={
          <Button danger type="primary" onClick={() => deletePeerChat(channel)}>
            {t('deleteChat')}
          </Button>
        }
      />
    );

  return (
    <>
      <FormCard
        description={t(archived ? 'settings.danger.unarchiveHint' : 'settings.danger.archiveHint')}
        title={t(archived ? 'unarchive' : 'archive')}
        action={
          <Button onClick={() => (archived ? void unarchive(channel.id) : archive(channel))}>
            {t(archived ? 'unarchive' : 'archive')}
          </Button>
        }
      />
      <FormCard
        danger
        description={t('settings.danger.trashHint')}
        title={t('moveToTrash')}
        action={
          <Button danger type="primary" onClick={() => remove(channel)}>
            {t('moveToTrash')}
          </Button>
        }
      />
    </>
  );
}
