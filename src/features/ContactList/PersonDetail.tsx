'use client';

import { CHANNEL_URL } from '@lobechat/const';
import type { ContactAgentProfile, ContactRequestItem } from '@lobechat/types';
import { Button, confirmModal, Empty, Flexbox, Skeleton, Text, toast } from '@lobehub/ui';
import * as stylex from '@stylexjs/stylex';
import {
  CheckIcon,
  MessageCircleIcon,
  UserRoundMinusIcon,
  UserRoundPlusIcon,
  UserRoundXIcon,
  XIcon,
} from 'lucide-react';
import { memo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router';

import AgentAvatar from '@/components/AgentAvatar';
import AsyncError from '@/components/AsyncError';
import UserAvatar from '@/components/UserAvatar';
import { personName } from '@/features/AddContactModal/result';
import NavHeader from '@/features/NavHeader';
import { useWorkspaceAwareNavigate } from '@/features/Workspace/useWorkspaceAwareNavigate';
import { channelActions } from '@/store/channel';
import { contactActions, contactSelectors, useContactStore } from '@/store/contact';

import { AVATAR_SIZE, styles, TileContent } from './cardParts';
import { AGENT_CONTACT_URL } from './const';
import { useMessageSharedAgent } from './useMessageSharedAgent';

const AGENT_ROW_AVATAR = 32;

/** Runs a contact write with a pending flag and the shared failure toast. */
const usePendingAction = () => {
  const { t } = useTranslation('common');
  const [pending, setPending] = useState<string>();
  const run = async (key: string, action: () => Promise<unknown>) => {
    setPending(key);
    try {
      await action();
    } catch (error) {
      console.error('[contacts] Contact action failed', error);
      toast.error(t('contacts.actionFailed'));
    } finally {
      setPending(undefined);
    }
  };
  return { pending, run };
};

const SharedAgentRow = memo<{ agent: ContactAgentProfile }>(({ agent }) => {
  const { t } = useTranslation('common');
  const navigate = useWorkspaceAwareNavigate();
  const added = useContactStore((s) => !!contactSelectors.agentById(agent.agentId)(s));
  const { pending, run } = usePendingAction();
  const { message, opening } = useMessageSharedAgent();
  const title = agent.title || t('untitledAgent', { ns: 'chat' });

  return (
    <Flexbox horizontal align={'center'} gap={12} style={{ textAlign: 'start' }}>
      <AgentAvatar
        agentId={agent.agentId}
        avatar={agent.avatar}
        background={agent.backgroundColor || undefined}
        name={title}
        size={AGENT_ROW_AVATAR}
      />
      <Flexbox flex={1} style={{ minWidth: 0 }}>
        <Text ellipsis weight={500}>
          {title}
        </Text>
        {agent.description && (
          <Text ellipsis fontSize={12} type={'secondary'}>
            {agent.description}
          </Text>
        )}
      </Flexbox>
      <Flexbox horizontal gap={8}>
        {added ? (
          <Button size={'small'} onClick={() => navigate(AGENT_CONTACT_URL(agent.agentId))}>
            {t('contacts.viewProfile')}
          </Button>
        ) : (
          <Button
            loading={!!pending}
            size={'small'}
            onClick={() => run('add', () => contactActions.addAgent(agent.shareId))}
          >
            {t('contacts.agent.add')}
          </Button>
        )}
        <Button
          loading={opening}
          size={'small'}
          type={'primary'}
          onClick={() => void message(agent)}
        >
          {t('contacts.sendMessage')}
        </Button>
      </Flexbox>
    </Flexbox>
  );
});

SharedAgentRow.displayName = 'SharedAgentRow';

/**
 * A person's card: who they are, what to do given our relation (request, accept, message,
 * remove), and, once we are contacts, the Agents they share.
 */
const PersonCard = memo<{ userId: string }>(({ userId }) => {
  const { t } = useTranslation('common');
  const navigate = useWorkspaceAwareNavigate();
  const { error } = contactActions.useFetchProfile(userId);
  contactActions.useFetchRequests();
  const profile = useContactStore(contactSelectors.profile(userId));
  const request = useContactStore((s) =>
    contactSelectors.requests(s).find((item: ContactRequestItem) => item.user.id === userId),
  );
  const { pending, run } = usePendingAction();

  if (!profile)
    return error ? (
      <Flexbox align={'center'} flex={1} justify={'center'} {...stylex.props(styles.state)}>
        <AsyncError error={error} variant="inline" />
      </Flexbox>
    ) : (
      <Flexbox align={'center'} gap={12} {...stylex.props(styles.state)}>
        <Skeleton.Avatar shape={'circle'} size={AVATAR_SIZE} />
        <Skeleton height={28} width={160} />
      </Flexbox>
    );

  const { relation, sharedAgents, user } = profile;
  const name = personName(user, t('contacts.people'));

  const message = () =>
    run('message', async () => {
      const channelId = await channelActions.openPeer(userId);
      if (channelId) navigate(CHANNEL_URL(channelId));
    });
  const remove = () =>
    confirmModal({
      cancelText: t('cancel'),
      content: t('contacts.person.remove.confirm', { name }),
      okButtonProps: { danger: true },
      okText: t('contacts.person.remove'),
      onOk: () => run('remove', () => contactActions.removeUser(userId)),
    });

  return (
    <Flexbox align={'center'} gap={8} {...stylex.props(styles.body, styles.coverless)}>
      <UserAvatar avatar={user.avatar} name={name} shape={'circle'} size={AVATAR_SIZE} />
      <Text ellipsis as={'h1'} fontSize={22} style={{ margin: 0, maxWidth: '100%' }} weight={600}>
        {name}
      </Text>
      {user.username && <Text type={'secondary'}>@{user.username}</Text>}

      {relation === 'request_received' && request?.message && (
        <Text type={'secondary'}>“{request.message}”</Text>
      )}

      <div {...stylex.props(styles.actions)}>
        {relation === 'contact' && (
          <>
            <button type="button" onClick={message} {...stylex.props(styles.tile)}>
              <TileContent icon={MessageCircleIcon} label={t('contacts.sendMessage')} />
            </button>
            <button type="button" onClick={remove} {...stylex.props(styles.tile)}>
              <TileContent icon={UserRoundMinusIcon} label={t('contacts.person.remove')} />
            </button>
          </>
        )}
        {relation === 'none' && (
          <button
            disabled={!!pending}
            type="button"
            onClick={() => run('request', () => contactActions.sendRequest(userId))}
            {...stylex.props(styles.tile)}
          >
            <TileContent icon={UserRoundPlusIcon} label={t('contacts.person.request')} />
          </button>
        )}
        {relation === 'request_received' && request && (
          <>
            <button
              disabled={!!pending}
              type="button"
              onClick={() => run('accept', () => contactActions.acceptRequest(request))}
              {...stylex.props(styles.tile)}
            >
              <TileContent icon={CheckIcon} label={t('contacts.person.accept')} />
            </button>
            <button
              disabled={!!pending}
              type="button"
              onClick={() => run('decline', () => contactActions.declineRequest(request))}
              {...stylex.props(styles.tile)}
            >
              <TileContent icon={XIcon} label={t('contacts.person.decline')} />
            </button>
          </>
        )}
        {relation === 'request_sent' && (
          <button
            disabled={!!pending || !request}
            type="button"
            onClick={() => request && run('cancel', () => contactActions.cancelRequest(request))}
            {...stylex.props(styles.tile)}
          >
            <TileContent icon={XIcon} label={t('contacts.person.cancel')} />
          </button>
        )}
      </div>

      {relation === 'request_sent' && (
        <Text fontSize={12} type={'secondary'}>
          {t('contacts.person.requestSent')}
        </Text>
      )}

      {sharedAgents.length > 0 && (
        <Flexbox gap={12} style={{ marginBlockStart: 24, width: '100%' }}>
          <Text fontSize={12} style={{ textAlign: 'start' }} type={'secondary'} weight={500}>
            {t('contacts.person.sharedAgents')}
          </Text>
          {sharedAgents.map((agent) => (
            <SharedAgentRow agent={agent} key={agent.agentId} />
          ))}
        </Flexbox>
      )}
    </Flexbox>
  );
});

PersonCard.displayName = 'PersonCard';

/** `/agents/people/:userId`: a person's card in the content column of the Contacts tab. */
const PersonDetailPage = () => {
  const { t } = useTranslation('common');
  const { userId } = useParams<{ userId: string }>();

  return (
    <Flexbox flex={1} height={'100%'}>
      <NavHeader />
      <Flexbox
        align={'center'}
        flex={1}
        paddingInline={16}
        style={{ overflowY: 'auto', paddingBlockStart: 8 }}
      >
        {userId ? (
          <PersonCard key={userId} userId={userId} />
        ) : (
          <Empty description={t('contacts.notFound')} icon={UserRoundXIcon} />
        )}
      </Flexbox>
    </Flexbox>
  );
};

export default PersonDetailPage;
