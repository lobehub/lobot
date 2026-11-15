'use client';

import type { ContactSearchResult } from '@lobechat/types';
import { Button, Flexbox, SearchBar, Text, toast, useModalContext } from '@lobehub/ui';
import { memo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import AgentAvatar from '@/components/AgentAvatar';
import UserAvatar from '@/components/UserAvatar';
import { AGENT_CONTACT_URL, PERSON_CONTACT_URL } from '@/features/ContactList/const';
import { useMessageSharedAgent } from '@/features/ContactList/useMessageSharedAgent';
import { useWorkspaceAwareNavigate } from '@/features/Workspace/useWorkspaceAwareNavigate';
import { contactService } from '@/services/contact';
import { contactActions } from '@/store/contact';

import { searchResultKey, searchResultName } from './result';

const AVATAR_SIZE = 40;

const ResultAction = memo<{ result: ContactSearchResult }>(({ result }) => {
  const { t } = useTranslation('common');
  const { close } = useModalContext();
  const navigate = useWorkspaceAwareNavigate();
  const [relation, setRelation] = useState(result.relation);
  const [pending, setPending] = useState(false);
  const { message: messageAgent, opening } = useMessageSharedAgent(close);

  const run = async (action: () => Promise<unknown>) => {
    setPending(true);
    try {
      await action();
    } catch (error) {
      console.error('[contacts] Failed to add a contact', error);
      toast.error(t('contacts.actionFailed'));
    } finally {
      setPending(false);
    }
  };

  if (result.type === 'agent') {
    // Messaging needs nothing but the live share; contacts are an optional bookmark.
    const message = (
      <Button
        loading={opening}
        size={'small'}
        type={'primary'}
        onClick={() => void messageAgent(result.agent)}
      >
        {t('contacts.sendMessage')}
      </Button>
    );
    if (relation === 'self') return message;
    return (
      <Flexbox horizontal gap={8}>
        {relation === 'none' ? (
          <Button
            loading={pending}
            size={'small'}
            onClick={() =>
              run(async () => {
                await contactActions.addAgent(result.agent.shareId);
                setRelation('contact');
                toast.success(t('contacts.agent.added'));
              })
            }
          >
            {t('contacts.agent.add')}
          </Button>
        ) : (
          <Button
            size={'small'}
            onClick={() => {
              close();
              navigate(AGENT_CONTACT_URL(result.agent.agentId));
            }}
          >
            {t('contacts.viewProfile')}
          </Button>
        )}
        {message}
      </Flexbox>
    );
  }

  switch (relation) {
    case 'none': {
      return (
        <Button
          loading={pending}
          size={'small'}
          type={'primary'}
          onClick={() =>
            run(async () => {
              const { status } = await contactActions.sendRequest(result.user.id);
              setRelation(status === 'accepted' ? 'contact' : 'request_sent');
            })
          }
        >
          {t('contacts.person.request')}
        </Button>
      );
    }
    case 'request_sent': {
      return (
        <Button disabled size={'small'}>
          {t('contacts.person.requestSent')}
        </Button>
      );
    }
    case 'self': {
      return (
        <Text fontSize={12} type={'secondary'}>
          {t('contacts.person.self')}
        </Text>
      );
    }
    default: {
      // A contact, or a request waiting for me: the profile shows what to do next.
      return (
        <Button
          size={'small'}
          onClick={() => {
            close();
            navigate(PERSON_CONTACT_URL(result.user.id));
          }}
        >
          {t('contacts.viewProfile')}
        </Button>
      );
    }
  }
});

ResultAction.displayName = 'AddContactResultAction';

const AddContactContent = memo(() => {
  const { t } = useTranslation('common');
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<ContactSearchResult[] | undefined>();

  const search = async () => {
    const value = query.trim();
    if (!value) return;
    setSearching(true);
    try {
      setResults(await contactService.search(value));
    } catch (error) {
      console.error('[contacts] Search failed', error);
      toast.error(t('contacts.actionFailed'));
    } finally {
      setSearching(false);
    }
  };

  return (
    <Flexbox gap={12} paddingBlock={'4px 16px'}>
      <SearchBar
        allowClear
        autoFocus
        loading={searching}
        placeholder={t('contacts.add.search.placeholder')}
        value={query}
        onSearch={() => void search()}
        onInputChange={(value) => {
          setQuery(value);
          setResults(undefined);
        }}
      />
      {results === undefined ? (
        <Text fontSize={12} type={'secondary'}>
          {t('contacts.add.search.hint')}
        </Text>
      ) : results.length === 0 ? (
        <Text fontSize={12} type={'secondary'}>
          {t('contacts.add.search.empty')}
        </Text>
      ) : (
        <Flexbox gap={8}>
          {results.map((result) => {
            const name = searchResultName(result, t('untitledAgent', { ns: 'chat' }));
            return (
              <Flexbox horizontal align={'center'} gap={12} key={searchResultKey(result)}>
                {result.type === 'agent' ? (
                  <AgentAvatar
                    agentId={result.agent.agentId}
                    avatar={result.agent.avatar}
                    background={result.agent.backgroundColor || undefined}
                    name={name}
                    size={AVATAR_SIZE}
                  />
                ) : (
                  <UserAvatar avatar={result.user.avatar} name={name} size={AVATAR_SIZE} />
                )}
                <Flexbox flex={1} style={{ minWidth: 0 }}>
                  <Text ellipsis weight={500}>
                    {name}
                  </Text>
                  <Text ellipsis fontSize={12} type={'secondary'}>
                    {result.type === 'agent'
                      ? t('contacts.agent.byOwner', {
                          name: result.agent.owner.fullName || result.agent.owner.username,
                        })
                      : result.user.username && `@${result.user.username}`}
                  </Text>
                </Flexbox>
                <ResultAction result={result} />
              </Flexbox>
            );
          })}
        </Flexbox>
      )}
    </Flexbox>
  );
});

AddContactContent.displayName = 'AddContactContent';

export default AddContactContent;
