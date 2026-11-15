'use client';

import type { ContactAgentItem, ContactRequestItem, ContactUserItem } from '@lobechat/types';
import { ActionIcon, Flexbox, toast } from '@lobehub/ui';
import { CheckIcon, XIcon } from 'lucide-react';
import { memo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import AgentAvatar from '@/components/AgentAvatar';
import UserAvatar from '@/components/UserAvatar';
import { personName } from '@/features/AddContactModal/result';
import { AVATAR_SIZE, ConversationRow } from '@/features/MessageList';
import { contactActions } from '@/store/contact';

import { AGENT_CONTACT_URL, PERSON_CONTACT_URL } from './const';

/** A mutual contact: a person you can message. */
export const PersonRow = memo<{ active: boolean; item: ContactUserItem }>(({ active, item }) => {
  const name = personName(item.user);
  return (
    <ConversationRow
      singleLine
      active={active}
      avatar={<UserAvatar avatar={item.user.avatar} name={name} size={AVATAR_SIZE} />}
      title={name}
      url={PERSON_CONTACT_URL(item.user.id)}
    />
  );
});

PersonRow.displayName = 'ContactPersonRow';

/** Another person's Agent added through its share; dimmed while the share is paused. */
export const SharedAgentRow = memo<{ active: boolean; item: ContactAgentItem }>(
  ({ active, item }) => {
    const { t } = useTranslation('common');
    const title = item.agent.title || t('untitledAgent', { ns: 'chat' });
    return (
      <ConversationRow
        singleLine
        active={active}
        tag={item.available ? personName(item.agent.owner) : t('contacts.agent.unavailable')}
        title={title}
        url={AGENT_CONTACT_URL(item.agent.agentId)}
        avatar={
          <AgentAvatar
            agentId={item.agent.agentId}
            avatar={item.agent.avatar}
            background={item.agent.backgroundColor || undefined}
            name={title}
            size={AVATAR_SIZE}
            style={item.available ? undefined : { opacity: 0.5 }}
          />
        }
      />
    );
  },
);

SharedAgentRow.displayName = 'ContactSharedAgentRow';

/** An incoming contact request, answered in place; the row opens the person's card. */
export const RequestRow = memo<{ active: boolean; request: ContactRequestItem }>(
  ({ active, request }) => {
    const { t } = useTranslation('common');
    const [pending, setPending] = useState(false);
    const name = personName(request.user);
    const answer = async (accept: boolean) => {
      setPending(true);
      try {
        await (accept
          ? contactActions.acceptRequest(request)
          : contactActions.declineRequest(request));
      } catch (error) {
        console.error('[contacts] Failed to answer a contact request', error);
        toast.error(t('contacts.actionFailed'));
      } finally {
        setPending(false);
      }
    };
    return (
      <Flexbox horizontal align={'center'} gap={4}>
        <Flexbox flex={1} style={{ minWidth: 0 }}>
          <ConversationRow
            singleLine
            active={active}
            avatar={<UserAvatar avatar={request.user.avatar} name={name} size={AVATAR_SIZE} />}
            preview={request.message || t('contacts.person.requestReceived')}
            title={name}
            url={PERSON_CONTACT_URL(request.user.id)}
          />
        </Flexbox>
        <ActionIcon
          disabled={pending}
          icon={CheckIcon}
          size={'small'}
          title={t('contacts.person.accept')}
          onClick={() => void answer(true)}
        />
        <ActionIcon
          disabled={pending}
          icon={XIcon}
          size={'small'}
          title={t('contacts.person.decline')}
          onClick={() => void answer(false)}
        />
      </Flexbox>
    );
  },
);

RequestRow.displayName = 'ContactRequestRow';
