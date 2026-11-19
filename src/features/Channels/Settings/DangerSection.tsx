import { Button, Flexbox, Text } from '@lobehub/ui';
import { Surface } from '@lobehub/ui/dashboard';
import { cssVar } from '@lobehub/ui/stylex/cssVar.stylex';
import type { ChannelListItem } from '@lobot/types';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { useChannelArchive } from '../useChannelArchive';
import { useDeletePeerChat } from '../useDeletePeerChat';
import { useRemoveChannel } from '../useRemoveChannel';

function DangerRow({
  action,
  description,
  divider,
  title,
}: {
  action: ReactNode;
  description: string;
  divider?: boolean;
  title: string;
}) {
  return (
    <Flexbox
      horizontal
      align="center"
      gap={12}
      style={{
        borderTop: divider ? `1px solid ${cssVar.colorBorderSecondary}` : undefined,
        minWidth: 0,
        paddingBlock: 10,
      }}
    >
      <Flexbox flex={1} gap={2} style={{ minWidth: 0 }}>
        <Text weight={400}>{title}</Text>
        <Text fontSize={12} type="secondary">
          {description}
        </Text>
      </Flexbox>
      <Flexbox horizontal style={{ flexShrink: 0 }}>
        {action}
      </Flexbox>
    </Flexbox>
  );
}

export function DangerSection({ channel }: { channel: ChannelListItem }) {
  const { t } = useTranslation('channel');
  const { archive, unarchive } = useChannelArchive();
  const remove = useRemoveChannel();
  const deletePeerChat = useDeletePeerChat();
  const archived = channel.status === 'archived';

  // Both people own a conversation between them, so it is deleted for me only, never archived or
  // trashed.
  return (
    <Surface padded={false} style={{ minWidth: 0, overflow: 'visible', padding: '4px 16px' }}>
      {channel.peerUserId ? (
        <DangerRow
          description={t('settings.danger.deleteChatHint')}
          title={t('deleteChat')}
          action={
            <Button
              danger
              size="small"
              style={{ fontWeight: 400 }}
              type="fill"
              onClick={() => deletePeerChat(channel)}
            >
              {t('deleteChat')}
            </Button>
          }
        />
      ) : (
        <>
          <DangerRow
            title={t(archived ? 'unarchive' : 'archive')}
            action={
              <Button
                size="small"
                style={{ fontWeight: 400 }}
                type="fill"
                onClick={() => (archived ? void unarchive(channel.id) : archive(channel))}
              >
                {archived ? t('unarchive') : t('taskList.bulk.archive', { ns: 'chat' })}
              </Button>
            }
            description={t(
              archived ? 'settings.danger.unarchiveHint' : 'settings.danger.archiveHint',
            )}
          />
          <DangerRow
            divider
            description={t('settings.danger.trashHint')}
            title={t('moveToTrash')}
            action={
              <Button
                danger
                size="small"
                style={{ fontWeight: 400 }}
                type="fill"
                onClick={() => remove(channel)}
              >
                {t('moveToTrash')}
              </Button>
            }
          />
        </>
      )}
    </Surface>
  );
}
