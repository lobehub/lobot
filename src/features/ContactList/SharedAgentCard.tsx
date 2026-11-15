'use client';

import { AGENT_CHAT_URL } from '@lobechat/const';
import type { ContactAgentItem } from '@lobechat/types';
import { confirmModal, Flexbox, Text, toast } from '@lobehub/ui';
import * as stylex from '@stylexjs/stylex';
import { MessageCircleIcon, UserRoundIcon, UserRoundMinusIcon } from 'lucide-react';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';

import AgentAvatar from '@/components/AgentAvatar';
import { personName } from '@/features/AddContactModal/result';
import { useAgentConversationLink } from '@/features/MessageList/useAgentConversationLink';
import { useWorkspaceAwareNavigate } from '@/features/Workspace/useWorkspaceAwareNavigate';
import WorkspaceLink from '@/features/Workspace/WorkspaceLink';
import { contactActions } from '@/store/contact';

import { AVATAR_SIZE, styles, TileContent } from './cardParts';
import { CONTACTS_URL, PERSON_CONTACT_URL } from './const';

/**
 * Another person's Agent added through its share. It has no profile to edit and runs as its
 * owner, so the card offers a conversation, its owner, and removal; a paused share keeps the
 * entry but cannot be messaged.
 */
const SharedAgentCard = memo<{ contact: ContactAgentItem }>(({ contact }) => {
  const { t } = useTranslation('common');
  const navigate = useWorkspaceAwareNavigate();
  const { agent, available } = contact;
  const title = agent.title || t('untitledAgent', { ns: 'chat' });
  const owner = personName(agent.owner);
  // Opens the direct Channel; there is no Agent page to fall back to.
  const message = useAgentConversationLink(agent.agentId, AGENT_CHAT_URL(agent.agentId));

  const remove = () =>
    confirmModal({
      cancelText: t('cancel'),
      content: t('contacts.agent.remove'),
      okButtonProps: { danger: true },
      okText: t('contacts.agent.remove'),
      onOk: async () => {
        try {
          await contactActions.removeAgent(agent.agentId);
          navigate(CONTACTS_URL);
        } catch (error) {
          console.error('[contacts] Failed to remove a shared Agent', error);
          toast.error(t('contacts.actionFailed'));
        }
      },
    });

  return (
    <Flexbox align={'center'} gap={8} {...stylex.props(styles.body, styles.coverless)}>
      <AgentAvatar
        agentId={agent.agentId}
        avatar={agent.avatar}
        background={agent.backgroundColor || undefined}
        name={title}
        shape={'circle'}
        size={AVATAR_SIZE}
      />
      <Text ellipsis as={'h1'} fontSize={22} style={{ margin: 0, maxWidth: '100%' }} weight={600}>
        {title}
      </Text>
      <Text type={'secondary'}>{t('contacts.agent.byOwner', { name: owner })}</Text>
      {!available && <Text type={'warning'}>{t('contacts.agent.unavailable')}</Text>}
      <div {...stylex.props(styles.actions)}>
        {available && (
          <WorkspaceLink to={message.url} onClick={message.onClick} {...stylex.props(styles.tile)}>
            <TileContent icon={MessageCircleIcon} label={t('contacts.sendMessage')} />
          </WorkspaceLink>
        )}
        <WorkspaceLink to={PERSON_CONTACT_URL(agent.owner.id)} {...stylex.props(styles.tile)}>
          <TileContent icon={UserRoundIcon} label={owner || t('contacts.viewProfile')} />
        </WorkspaceLink>
        <button type="button" onClick={remove} {...stylex.props(styles.tile)}>
          <TileContent icon={UserRoundMinusIcon} label={t('contacts.agent.remove')} />
        </button>
      </div>
      {agent.description && (
        <Text style={{ marginBlockStart: 16 }} type={'secondary'}>
          {agent.description}
        </Text>
      )}
    </Flexbox>
  );
});

SharedAgentCard.displayName = 'SharedAgentCard';

export default SharedAgentCard;
