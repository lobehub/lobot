import type { ChannelPublicMessage } from '@lobot/types';
import { Flexbox, Text } from '@lobehub/ui';
import { useTranslation } from 'react-i18next';

import AgentAvatar from '@/components/AgentAvatar';

/**
 * "Relayed by <Agent>" beside a message's time: the person sent it, but an Agent in another
 * Channel wrote it for them. On a receipt it names the Agent whose reply it brings back.
 */
export const RelayLabel = ({ message }: { message: ChannelPublicMessage }) => {
  const { t } = useTranslation('channel');
  const { receipt, via } = message;
  if (!via) return null;

  return (
    <Flexbox horizontal align={'center'} gap={4} style={{ minWidth: 0 }}>
      <AgentAvatar
        agentId={via.agentId}
        avatar={via.avatar ?? undefined}
        name={via.name}
        shape={'circle'}
        size={14}
      />
      <Text ellipsis as={'span'} fontSize={12} type={'secondary'}>
        {receipt
          ? t('message.relayReplyFrom', { channel: receipt.channelTitle, name: via.name })
          : t('message.relayedBy', { name: via.name })}
      </Text>
    </Flexbox>
  );
};
