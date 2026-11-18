'use client';

import { CHANNEL_URL } from '@lobechat/const';
import { Button, Flexbox, toast } from '@lobehub/ui';
import { cssVar } from '@lobehub/ui/stylex/cssVar.stylex';
import * as stylex from '@stylexjs/stylex';
import { MessageCircleIcon, UserRoundIcon } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router';

import { useWorkspaceAwareNavigate } from '@/features/Workspace/useWorkspaceAwareNavigate';
import { channelActions, channelSelectors, useChannelStore } from '@/store/channel';

const styles = stylex.create({
  actions: {
    paddingBlock: 12,
    paddingInline: 16,
    borderBlockStartWidth: 1,
    borderBlockStartStyle: 'solid',
    borderBlockStartColor: cssVar.colorBorderSecondary,
  },
});

interface AgentCardActionsProps {
  agentId: string;
  /** Closes the card before it navigates away. */
  onDone: () => void;
  /** The Agent's own page: its contact card. */
  profileUrl: string;
}

/**
 * A person's card ends in "Send message"; an Agent's card offers the same, plus a way to its
 * full profile. "Send message" is left out inside the conversation with that Agent itself.
 */
export const AgentCardActions = ({ agentId, onDone, profileUrl }: AgentCardActionsProps) => {
  const { t } = useTranslation('common');
  const navigate = useWorkspaceAwareNavigate();
  const { channelId } = useParams<{ channelId?: string }>();
  const directChannelId = useChannelStore((s) => channelSelectors.directByAgent(agentId)(s)?.id);
  const [pending, setPending] = useState(false);
  const inDirect = !!channelId && channelId === directChannelId;

  const openMessage = async () => {
    setPending(true);
    try {
      const id = await channelActions.openDirect(agentId);
      if (!id) {
        toast.error(t('openDirect.unavailable', { ns: 'channel' }));
        return;
      }
      onDone();
      navigate(CHANNEL_URL(id));
    } catch (error) {
      console.error('[channel] Failed to open the direct Channel', error);
      toast.error(t('openDirect.failed', { ns: 'channel' }));
    } finally {
      setPending(false);
    }
  };

  return (
    <Flexbox horizontal gap={8} {...stylex.props(styles.actions)}>
      {!inDirect && (
        <Button
          block
          icon={MessageCircleIcon}
          loading={pending}
          type={'fill'}
          onClick={openMessage}
        >
          {t('contacts.sendMessage')}
        </Button>
      )}
      <Button
        block
        icon={UserRoundIcon}
        type={inDirect ? 'fill' : 'default'}
        onClick={() => {
          onDone();
          navigate(profileUrl);
        }}
      >
        {t('contacts.viewProfile')}
      </Button>
    </Flexbox>
  );
};
